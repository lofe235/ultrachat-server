'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MAX_MESSAGES = 20_000;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function emptyBans() {
  return { devices: [], ips: [] };
}

/**
 * Loopback-адреса на хостинге alwaysdata принадлежат reverse-proxy, а не
 * пользователю: все клиенты приходят с ::1. Бан такого адреса заблокировал
 * бы вообще всех, поэтому он никогда не должен срабатывать.
 */
function isLoopbackAddress(value) {
  const ip = String(value || '').trim().toLowerCase();
  if (!ip) return false;
  if (ip === '::1' || ip === '::' || ip === '0.0.0.0') return true;
  if (ip.startsWith('127.')) return true;
  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice(7);
    return mapped.startsWith('127.') || mapped === '0.0.0.0';
  }
  return false;
}

/**
 * Простое файловое хранилище без нативных зависимостей.
 * Запись атомарная: сначала temp-файл, затем rename.
 */
class Store {
  constructor(dataDir) {
    this.dir = dataDir;
    this.file = path.join(dataDir, 'db.json');
    this.db = { version: 1, users: {}, messages: [], bans: emptyBans(), notice: null };
    this.saveTimer = null;
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const bans = parsed.bans && typeof parsed.bans === 'object' ? parsed.bans : {};
        this.db = {
          version: 1,
          users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
          messages: Array.isArray(parsed.messages) ? parsed.messages : [],
          bans: {
            devices: Array.isArray(bans.devices) ? bans.devices : [],
            ips: Array.isArray(bans.ips) ? bans.ips : [],
          },
          notice: parsed.notice && typeof parsed.notice === 'object' ? parsed.notice : null,
        };
        // Старые версии могли сохранить бан ::1. Такой бан блокирует всех,
        // поэтому молча вычищаем его при загрузке базы.
        const before = this.db.bans.ips.length;
        this.db.bans.ips = this.db.bans.ips.filter(
          (item) => !isLoopbackAddress(item && item.value),
        );
        if (this.db.bans.ips.length !== before) this.scheduleSave();
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('[store] не удалось прочитать базу:', err.message);
      }
    }
  }

  scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, 250);
    if (typeof this.saveTimer.unref === 'function') this.saveTimer.unref();
  }

  saveNow() {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.db), 'utf8');
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('[store] не удалось сохранить базу:', err.message);
    }
  }

  /**
   * Полная очистка базы: пользователи, сообщения, история.
   * Используется служебным запросом администратора, чтобы не перезапускать
   * сервер (перезапуск рвёт туннель и меняет публичный адрес).
   */
  reset() {
    this.db = { version: 1, users: {}, messages: [], bans: emptyBans(), notice: null };
    this.saveNow();
  }

  getUser(id) {
    return this.db.users[id] || null;
  }

  getUserByDevice(deviceId) {
    if (!deviceId) return null;
    return Object.values(this.db.users).find((u) => u.deviceId === deviceId) || null;
  }

  findByToken(token) {
    if (!token) return null;
    const hash = hashToken(token);
    return Object.values(this.db.users).find((u) => u.tokenHash === hash) || null;
  }

  verifyToken(user, token) {
    if (!user || !token) return false;
    const hash = hashToken(token);
    const expected = String(user.tokenHash || '');
    if (hash.length !== expected.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  createUser({ deviceId, nickname, avatarId, creator }) {
    const id = crypto.randomBytes(9).toString('base64url');
    const token = crypto.randomBytes(32).toString('base64url');
    const ts = Date.now();
    const user = {
      id,
      deviceId,
      nickname,
      displayName: displayName(nickname, !!creator),
      avatarId,
      creator: !!creator,
      model: '',
      tokenHash: hashToken(token),
      createdAt: ts,
      lastSeenAt: ts,
    };
    this.db.users[id] = user;
    this.scheduleSave();
    return { user, token };
  }

  updateUser(user, patch) {
    Object.assign(user, patch);
    this.scheduleSave();
    return user;
  }

  rotateToken(user) {
    const token = crypto.randomBytes(32).toString('base64url');
    user.tokenHash = hashToken(token);
    this.scheduleSave();
    return token;
  }

  touch(user) {
    user.lastSeenAt = Date.now();
    this.scheduleSave();
  }

  addMessage(message) {
    this.db.messages.push(message);
    if (this.db.messages.length > MAX_MESSAGES) {
      this.db.messages.splice(0, this.db.messages.length - MAX_MESSAGES);
    }
    this.scheduleSave();
  }

  /**
   * Помечает прочитанными входящие сообщения от peer до отметки upTo.
   * Возвращает верхнюю границу реально прочитанных сообщений, чтобы
   * отправитель мог обновить галочки.
   */
  markRead({ userId, peer, upTo }) {
    const limit = Number(upTo);
    if (!Number.isFinite(limit) || limit <= 0) return { changed: 0, upTo: 0 };
    const now = Date.now();
    let changed = 0;
    let highest = 0;
    for (const message of this.db.messages) {
      if (message.from !== peer || message.to !== userId) continue;
      if (message.ts > limit) continue;
      if (!message.readAt) {
        message.readAt = now;
        changed += 1;
      }
      if (message.ts > highest) highest = message.ts;
    }
    if (changed > 0) this.scheduleSave();
    return { changed, upTo: highest };
  }

  /** Редактирование своего текстового сообщения. */
  editMessage({ userId, id, text }) {
    const message = this.db.messages.find((item) => item.id === id);
    if (!message || message.from !== userId || message.kind !== 'text') return null;
    message.text = text;
    message.editedAt = Date.now();
    this.scheduleSave();
    return message;
  }

  /** Удаление своего сообщения. Возвращает удалённую запись для очистки медиа. */
  deleteMessage({ userId, id }) {
    const index = this.db.messages.findIndex(
      (item) => item.id === id && item.from === userId,
    );
    if (index < 0) return null;
    const [message] = this.db.messages.splice(index, 1);
    this.scheduleSave();
    return message;
  }

  /** Удаление всей переписки между двумя пользователями (для обоих). */
  deleteConversation({ userId, peer }) {
    const removed = [];
    this.db.messages = this.db.messages.filter((message) => {
      const match = (
        (message.from === userId && message.to === peer) ||
        (message.from === peer && message.to === userId)
      );
      if (match) removed.push(message);
      return !match;
    });
    if (removed.length > 0) this.scheduleSave();
    return removed;
  }

  /**
   * Полностью удаляет аккаунт и все сообщения, где он был отправителем
   * или получателем. Устройство после этого может зарегистрироваться заново.
   */
  deleteUser(userId) {
    const user = this.db.users[userId];
    if (!user) return null;
    delete this.db.users[userId];
    const removedMessages = [];
    this.db.messages = this.db.messages.filter((message) => {
      const match = message.from === userId || message.to === userId;
      if (match) removedMessages.push(message);
      return !match;
    });
    this.scheduleSave();
    return { user, messages: removedMessages };
  }

  /**
   * Очистка общего чата (лобби). Личные переписки не затрагиваются.
   * Возвращает удалённые сообщения, чтобы вызывающая сторона почистила фото.
   */
  clearLobby() {
    const removed = [];
    this.db.messages = this.db.messages.filter((message) => {
      if (message.to === null) {
        removed.push(message);
        return false;
      }
      return true;
    });
    if (removed.length > 0) this.scheduleSave();
    return removed;
  }

  banList() {
    return {
      devices: this.db.bans.devices.map((item) => ({ ...item })),
      ips: this.db.bans.ips.map((item) => ({ ...item })),
    };
  }

  findBan({ deviceId, ip }) {
    if (deviceId) {
      const found = this.db.bans.devices.find((item) => item.value === deviceId);
      if (found) return { ...found, kind: 'device' };
    }
    if (ip && !isLoopbackAddress(ip)) {
      const found = this.db.bans.ips.find((item) => item.value === ip);
      if (found) return { ...found, kind: 'ip' };
    }
    return null;
  }

  addBan({ kind, value, reason, createdAt }) {
    const key = kind === 'ip' ? 'ips' : 'devices';
    const list = this.db.bans[key];
    const entry = {
      value: String(value),
      reason: String(reason || '').slice(0, 200),
      createdAt: Number(createdAt) || Date.now(),
    };
    const index = list.findIndex((item) => item.value === entry.value);
    if (index >= 0) list[index] = entry;
    else {
      list.push(entry);
      if (list.length > 500) list.splice(0, list.length - 500);
    }
    this.scheduleSave();
    return { ...entry, kind };
  }

  removeBan(kind, value) {
    const key = kind === 'ip' ? 'ips' : 'devices';
    const list = this.db.bans[key];
    const before = list.length;
    this.db.bans[key] = list.filter((item) => item.value !== value);
    if (this.db.bans[key].length !== before) this.scheduleSave();
    return before - this.db.bans[key].length;
  }

  setNotice(notice) {
    this.db.notice = notice || null;
    this.scheduleSave();
    return this.db.notice;
  }

  getNotice() {
    return this.db.notice || null;
  }

  clearNotice() {
    if (!this.db.notice) return false;
    this.db.notice = null;
    this.scheduleSave();
    return true;
  }

  /**
   * История либо общего чата (peer = null), либо личной переписки.
   * Возвращает сообщения от старых к новым.
   */
  history({ userId, peer, limit = 50, before = 0 }) {
    const cap = Math.max(1, Math.min(200, Number(limit) || 50));
    const pivot = Number(before) > 0 ? Number(before) : Number.MAX_SAFE_INTEGER;
    const result = [];
    for (let i = this.db.messages.length - 1; i >= 0 && result.length < cap; i -= 1) {
      const m = this.db.messages[i];
      if (m.ts > pivot) continue;
      if (peer === null) {
        if (m.to !== null) continue;
      } else if (!(
        (m.from === userId && m.to === peer) ||
        (m.from === peer && m.to === userId)
      )) {
        continue;
      }
      result.push(m);
    }
    return result.reverse();
  }

  stats() {
    return {
      users: Object.keys(this.db.users).length,
      messages: this.db.messages.length,
    };
  }
}

function displayName(nickname, creator) {
  return creator ? `[Создатель] ${nickname}` : nickname;
}

module.exports = { Store, hashToken, displayName, isLoopbackAddress, MAX_MESSAGES };
