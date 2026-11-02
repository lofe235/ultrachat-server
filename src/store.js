'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MAX_MESSAGES = 20_000;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Простое файловое хранилище без нативных зависимостей.
 * Запись атомарная: сначала temp-файл, затем rename.
 */
class Store {
  constructor(dataDir) {
    this.dir = dataDir;
    this.file = path.join(dataDir, 'db.json');
    this.db = { version: 1, users: {}, messages: [] };
    this.saveTimer = null;
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        this.db = {
          version: 1,
          users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
          messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        };
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
    this.db = { version: 1, users: {}, messages: [] };
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

module.exports = { Store, hashToken, displayName, MAX_MESSAGES };
