'use strict';

const http = require('node:http');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const crypto = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { Store, displayName, isLoopbackAddress } = require('./store');

const VERSION = 1;
const MAX_TEXT = 4000;
const MAX_FRAME = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 1_800_000;
const MAX_NICKNAME = 24;
const MAX_DEVICE_ID = 96;
const HELLO_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 30_000;
const RATE_WINDOW_MS = 10_000;
const RATE_MAX_MESSAGES = 40;
const MAX_BODY = 64 * 1024;
const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000;
const NOTICE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BAN_REASON = 200;
const MAX_ADMIN_USERS = 500;

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function normalizeNickname(raw) {
  return String(raw || '')
    .replace(/\[Создатель\]/gi, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NICKNAME);
}

function normalizeAvatar(raw) {
  const id = String(raw || '').trim().slice(0, 32);
  return /^[a-z0-9_-]{1,32}$/i.test(id) ? id : 'initials';
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function sendJson(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

/** Определяет формат картинки по сигнатуре, чтобы не доверять расширению. */
function sniffImage(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  if (
    buffer.length > 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/** Принимает base64 или data:image/...;base64,... и возвращает готовые байты. */
function parseImagePayload(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  if (raw.length > MAX_IMAGE_BYTES * 2) return null;
  let base64 = raw.trim();
  const dataUrl = /^data:image\/[a-z0-9.+-]+;base64,([a-z0-9+/=\s]+)$/i.exec(base64);
  if (dataUrl) base64 = dataUrl[1];
  base64 = base64.replace(/\s+/g, '');
  if (!/^[a-z0-9+/]+={0,2}$/i.test(base64)) return null;
  let buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;
  const ext = sniffImage(buffer);
  if (!ext) return null;
  return { buffer, ext };
}

function readJson(req, limit = MAX_BODY) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return reject(Object.assign(new Error('bad json'), { status: 400 }));
        }
        resolve(parsed);
      } catch {
        reject(Object.assign(new Error('bad json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

/** Читает тело запроса как байты. Нужно для загрузки фото отдельным HTTP-запросом. */
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function bearerToken(req) {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

/** Пароль администратора хранится в data/ и не попадает в публичный репозиторий. */
function loadAdminPassword(dataDir) {
  const file = path.join(dataDir, 'admin-password.txt');
  try {
    const value = fs.readFileSync(file, 'utf8').trim();
    if (value) return value;
  } catch {
    /* файла ещё нет */
  }
  return String(process.env.ADMIN_PASSWORD || '').trim();
}

function safeEqualText(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function sanitizeNoticeUrl(raw) {
  const value = String(raw || '').trim().slice(0, 500);
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '';
}

function createApp(options = {}) {
  const dataDir = options.dataDir || path.join(__dirname, '..', 'data');
  const publicDir = options.publicDir || path.join(__dirname, '..', 'public');
  const mediaDir = options.mediaDir || path.join(dataDir, 'media');
  const apkPath = options.apkPath || path.join(
    __dirname,
    '..',
    '..',
    'UltraChat',
    'app',
    'build',
    'outputs',
    'apk',
    'debug',
    'app-debug.apk',
  );
  const store = new Store(dataDir);
  fs.mkdirSync(mediaDir, { recursive: true });
  const adminPassword = loadAdminPassword(dataDir);
  /** @type {Map<string, {ip: string, createdAt: number, expiresAt: number}>} */
  const adminSessions = new Map();
  if (!adminPassword) {
    log('admin: пароль не задан (data/admin-password.txt или ADMIN_PASSWORD)');
  }

  // Ключ администратора создаётся один раз и лежит только на этом ПК.
  // Нужен для служебной очистки базы без перезапуска сервера.
  const adminKey = (() => {
    const file = path.join(dataDir, 'admin-key.txt');
    try {
      const existing = fs.readFileSync(file, 'utf8').trim();
      if (existing) return existing;
    } catch {
      /* файла ещё нет — создадим ниже */
    }
    const key = crypto.randomBytes(18).toString('hex');
    try {
      fs.writeFileSync(file, `${key}\n`, 'utf8');
    } catch {
      /* без файла ключ останется только в памяти */
    }
    return key;
  })();

  /** @type {Map<string, Set<WebSocket>>} */
  const online = new Map();
  const ipHits = new Map();
  const adminHits = new Map();

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_FRAME,
    perMessageDeflate: false,
    clientTracking: true,
  });

  const server = http.createServer((req, res) => {
    handleHttp(req, res).catch((err) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const status = err && err.status ? err.status : 500;
      if (status >= 500) log('http error:', err && err.message);
      sendJson(res, status, { ok: false, error: status === 500 ? 'internal_error' : err.message });
    });
  });

  server.on('upgrade', (req, socket, head) => {
    // Мелкие кадры (текст, ack) не должны ждать алгоритм Нейгла.
    try {
      socket.setNoDelay(true);
    } catch {
      /* сокет уже закрыт */
    }
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== '/ws') {
      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    const token = url.searchParams.get('token') || bearerToken(req);
    const user = store.findByToken(token);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    const upgradeIp = clientIp(req);
    if (store.findBan({ deviceId: user.deviceId, ip: upgradeIp })) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      ws.remoteIp = upgradeIp;
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    const user = ws.user;
    ws.helloDone = false;
    // Поле должно называться так же, как в heartbeat ниже. Раньше здесь было
    // ws.alive, а проверялось ws.isAlive — из-за этого сервер считал клиента
    // мёртвым и рвал соединение каждые 60 секунд, хотя связь была жива.
    ws.isAlive = true;
    ws.windowStart = Date.now();
    ws.windowCount = 0;
    ws.helloTimeout = setTimeout(() => {
      if (!ws.helloDone) {
        send(ws, { v: VERSION, type: 'error', code: 'hello_timeout', message: 'Не получен HELLO' });
        ws.close(4001, 'hello timeout');
      }
    }, HELLO_TIMEOUT_MS);

    let set = online.get(user.id);
    if (!set) {
      set = new Set();
      online.set(user.id, set);
    }
    set.add(ws);
    log(`+ ${user.nickname} (${user.id}) ${ws.remoteIp}`);

    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        send(ws, { v: VERSION, type: 'error', code: 'binary_not_supported', message: 'Только JSON' });
        return;
      }
      handleFrame(ws, data.toString('utf8'));
    });
    ws.on('error', (err) => log('ws error:', err.message));
    ws.on('close', (code, reason) => {
      clearTimeout(ws.helloTimeout);
      const sockets = online.get(user.id);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          online.delete(user.id);
          store.touch(user);
          log(`- ${user.nickname} (${user.id}) код=${code} причина=${reason || '—'}`);
        }
      }
      broadcastRoster();
    });
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        /* ignore */
      }
    }
  }, HEARTBEAT_MS);
  if (typeof heartbeat.unref === 'function') heartbeat.unref();

  // -------------------------------------------------------------------
  // Admin helpers
  // -------------------------------------------------------------------

  function adminSessionFor(req, url) {
    const token = bearerToken(req) || url.searchParams.get('admin_token') || '';
    if (!token) return null;
    const session = adminSessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      adminSessions.delete(token);
      return null;
    }
    return session;
  }

  function adminState() {
    const stats = store.stats();
    const users = Object.values(store.db.users)
      .map((user) => ({
        id: user.id,
        nickname: user.nickname,
        displayName: user.displayName,
        deviceId: user.deviceId,
        lastIp: user.lastIp || '',
        lastIpAt: user.lastIpAt || 0,
        createdAt: user.createdAt || 0,
        lastSeenAt: user.lastSeenAt || 0,
        creator: user.creator === true,
        model: user.model || '',
        online: (online.get(user.id)?.size || 0) > 0,
        deviceBanned: !!store.findBan({ deviceId: user.deviceId }),
        ipBanned: !!user.lastIp && !!store.findBan({ ip: user.lastIp }),
      }))
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return (b.lastSeenAt || 0) - (a.lastSeenAt || 0);
      })
      .slice(0, MAX_ADMIN_USERS);
    const lobbyMessages = store.db.messages.reduce(
      (count, message) => count + (message.to === null ? 1 : 0),
      0,
    );
    return {
      ok: true,
      server: {
        version: VERSION,
        uptime: Math.round(process.uptime()),
        apk: fs.existsSync(apkPath),
        serverTime: Date.now(),
      },
      stats: {
        users: stats.users,
        messages: stats.messages,
        online: onlineCount(),
        lobbyMessages,
      },
      users,
      bans: store.banList(),
      notice: store.getNotice(),
    };
  }

  function enforceBan(kind, value) {
    // Страховка: loopback-адрес принадлежит прокси хостинга, а не клиенту.
    if (kind === 'ip' && isLoopbackAddress(value)) return;
    for (const ws of wss.clients) {
      if (!ws.user || ws.readyState !== WebSocket.OPEN) continue;
      const match = kind === 'ip' ? ws.remoteIp === value : ws.user.deviceId === value;
      if (!match) continue;
      send(ws, {
        v: VERSION,
        type: 'error',
        code: 'banned',
        message: 'Доступ заблокирован администратором',
      });
      try {
        ws.close(4004, 'banned');
      } catch {
        /* ignore */
      }
    }
  }

  // -------------------------------------------------------------------
  // HTTP
  // -------------------------------------------------------------------

  async function handleHttp(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const ip = clientIp(req);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === '/health') {
      if (!allowIp(ip, 120)) return sendJson(res, 429, { ok: false, error: 'rate_limited' });
      const stats = store.stats();
      sendJson(res, 200, {
        ok: true,
        name: 'UltraChat',
        version: VERSION,
        uptime: Math.round(process.uptime()),
        users: stats.users,
        messages: stats.messages,
        online: onlineCount(),
        apk: fs.existsSync(apkPath),
      });
      return;
    }

    if (pathname === '/api/admin/login' && req.method === 'POST') {
      if (!allowAdmin(ip, 10)) return sendJson(res, 429, { ok: false, error: 'rate_limited' });
      if (!adminPassword) {
        return sendJson(res, 503, {
          ok: false,
          error: 'admin_disabled',
          message: 'Пароль администратора не настроен на сервере',
        });
      }
      const body = await readJson(req);
      const password = String(body.password || '');
      if (!safeEqualText(password, adminPassword)) {
        return sendJson(res, 403, { ok: false, error: 'bad_password' });
      }
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = Date.now() + ADMIN_SESSION_MS;
      adminSessions.set(token, { ip, createdAt: Date.now(), expiresAt });
      log(`admin: вход с ${ip}`);
      sendJson(res, 200, { ok: true, token, expiresAt });
      return;
    }

    if (pathname === '/api/admin/state' && req.method === 'GET') {
      const session = adminSessionFor(req, url);
      if (!session) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      sendJson(res, 200, adminState());
      return;
    }

    if (pathname === '/api/admin/lobby/clear' && req.method === 'POST') {
      const session = adminSessionFor(req, url);
      if (!session) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      const removed = store.clearLobby();
      for (const message of removed) removeMedia(message.image);
      broadcast({ v: VERSION, type: 'lobby_cleared', at: Date.now() });
      log(`admin: очищен общий чат (${removed.length}) с ${session.ip}`);
      sendJson(res, 200, { ok: true, removed: removed.length });
      return;
    }

    if (pathname === '/api/admin/ban' && req.method === 'POST') {
      const session = adminSessionFor(req, url);
      if (!session) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      const body = await readJson(req);
      const kind = body.kind === 'ip' ? 'ip' : body.kind === 'device' ? 'device' : '';
      const value = String(body.value || '').trim().slice(0, kind === 'ip' ? 64 : MAX_DEVICE_ID);
      if (!kind || !value) return sendJson(res, 400, { ok: false, error: 'value_required' });
      if (kind === 'ip' && !net.isIP(value)) {
        return sendJson(res, 400, { ok: false, error: 'bad_ip', message: 'Некорректный IP-адрес' });
      }
      if (kind === 'ip' && isLoopbackAddress(value)) {
        // alwaysdata проксирует всех через localhost, поэтому в панели у
        // каждого пользователя виден ::1. Бан такого адреса выключил бы
        // регистрацию и WebSocket вообще всем.
        return sendJson(res, 400, {
          ok: false,
          error: 'ip_ban_unavailable',
          message: 'На этом хостинге реальные IP скрыты: все клиенты видны как ::1. ' +
            'IP-бан заблокировал бы всех. Забаньте устройство или ник.',
        });
      }
      if (kind === 'device' && value.length < 4) {
        return sendJson(res, 400, { ok: false, error: 'bad_device', message: 'Слишком короткий ID устройства' });
      }
      const reason = String(body.reason || '').slice(0, MAX_BAN_REASON);
      const ban = store.addBan({ kind, value, reason, createdAt: Date.now() });
      enforceBan(kind, value);
      log(`admin: бан ${kind} ${value} (${reason || 'без причины'}) с ${session.ip}`);
      sendJson(res, 200, { ok: true, ban, bans: store.banList() });
      return;
    }

    if (pathname === '/api/admin/unban' && req.method === 'POST') {
      const session = adminSessionFor(req, url);
      if (!session) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      const body = await readJson(req);
      const kind = body.kind === 'ip' ? 'ip' : body.kind === 'device' ? 'device' : '';
      const value = String(body.value || '').trim();
      if (!kind || !value) return sendJson(res, 400, { ok: false, error: 'value_required' });
      const removed = store.removeBan(kind, value);
      log(`admin: разбан ${kind} ${value} с ${session.ip}`);
      sendJson(res, 200, { ok: true, removed, bans: store.banList() });
      return;
    }

    if (pathname === '/api/admin/kick' && req.method === 'POST') {
      const session = adminSessionFor(req, url);
      if (!session) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      const body = await readJson(req);
      const userId = String(body.userId || '').trim().slice(0, 64);
      if (!userId) return sendJson(res, 400, { ok: false, error: 'user_required' });
      let kicked = 0;
      for (const target of online.get(userId) || []) {
        if (target.readyState === WebSocket.OPEN) {
          send(target, {
            v: VERSION,
            type: 'error',
            code: 'kicked',
            message: 'Сеанс завершён администратором',
          });
          try {
            target.close(4005, 'kicked by admin');
            kicked += 1;
          } catch {
            /* ignore */
          }
        }
      }
      log(`admin: отключён пользователь ${userId} с ${session.ip}`);
      sendJson(res, 200, { ok: true, kicked });
      return;
    }

    if (pathname === '/api/admin/delete-user' && req.method === 'POST') {
      const session = adminSessionFor(req, url);
      if (!session) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      const body = await readJson(req);
      const userId = String(body.userId || '').trim().slice(0, 64);
      if (!userId) return sendJson(res, 400, { ok: false, error: 'user_required' });
      const removed = store.deleteUser(userId);
      if (!removed) return sendJson(res, 404, { ok: false, error: 'unknown_user' });
      for (const message of removed.messages) removeMedia(message.image);
      let kicked = 0;
      for (const target of online.get(userId) || []) {
        if (target.readyState === WebSocket.OPEN) {
          send(target, {
            v: VERSION,
            type: 'error',
            code: 'account_deleted',
            message: 'Аккаунт удалён администратором',
          });
          try {
            target.close(4006, 'account deleted');
            kicked += 1;
          } catch {
            /* ignore */
          }
        }
      }
      online.delete(userId);
      broadcastRoster();
      log(
        `admin: удалён аккаунт ${removed.user.nickname} (${userId}), сообщений: ${removed.messages.length}, сеансов: ${kicked} с ${session.ip}`,
      );
      sendJson(res, 200, { ok: true, kicked, removedMessages: removed.messages.length });
      return;
    }

    if (pathname === '/api/admin/notice' && req.method === 'POST') {
      const session = adminSessionFor(req, url);
      if (!session) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      const body = await readJson(req);
      const notice = {
        id: crypto.randomBytes(8).toString('hex'),
        title: String(body.title || '').trim().slice(0, 120) || 'Обновление UltraChat',
        text: String(body.text || '').trim().slice(0, 1000),
        version: String(body.version || '').trim().slice(0, 32),
        url: sanitizeNoticeUrl(body.url),
        createdAt: Date.now(),
      };
      store.setNotice(notice);
      broadcast({ v: VERSION, type: 'notice', ...notice });
      log(`admin: уведомление ${notice.id} отправлено с ${session.ip}`);
      sendJson(res, 200, { ok: true, notice });
      return;
    }

    if (pathname === '/api/admin/notice/clear' && req.method === 'POST') {
      const session = adminSessionFor(req, url);
      if (!session) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      store.clearNotice();
      broadcast({ v: VERSION, type: 'notice_cleared' });
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === '/api/admin/reset' && req.method === 'POST') {
      const provided = String(req.headers['x-admin-key'] || '');
      if (!adminKey || provided !== adminKey) {
        return sendJson(res, 403, { ok: false, error: 'forbidden' });
      }
      store.reset();
      let removed = 0;
      try {
        for (const name of fs.readdirSync(mediaDir)) {
          try {
            fs.unlinkSync(path.join(mediaDir, name));
            removed += 1;
          } catch {
            /* пропускаем занятые файлы */
          }
        }
      } catch {
        /* папки может не быть */
      }
      sendJson(res, 200, { ok: true, removed });
      return;
    }

    if (pathname === '/api/register' && req.method === 'POST') {
      // 60 попыток в минуту: запасным сетям и переподключениям хватает,
      // а подбор пароля всё равно ограничен.
      if (!allowIp(ip, 60)) return sendJson(res, 429, { ok: false, error: 'rate_limited' });
      const body = await readJson(req);
      const deviceId = String(body.deviceId || '').trim().slice(0, MAX_DEVICE_ID);
      const nickname = normalizeNickname(body.nickname);
      if (deviceId.length < 4) {
        return sendJson(res, 400, { ok: false, error: 'device_id_required' });
      }
      if (!nickname) {
        return sendJson(res, 400, { ok: false, error: 'nickname_required' });
      }
      const registerBan = store.findBan({ deviceId, ip });
      if (registerBan) {
        return sendJson(res, 403, {
          ok: false,
          error: 'banned',
          message: 'Доступ заблокирован администратором',
          ban: { kind: registerBan.kind, reason: registerBan.reason || '' },
        });
      }
      const avatarId = normalizeAvatar(body.avatarId ?? body.avatar);
      const creator = body.creator === true;
      const model = String(body.model || '').slice(0, 64);

      let user = store.getUserByDevice(deviceId);
      let token = null;
      let created = false;
      if (user && typeof body.token === 'string' && store.verifyToken(user, body.token)) {
        token = body.token;
      } else if (user) {
        // Переустановка приложения: устройство то же, токен утерян.
        token = store.rotateToken(user);
      } else {
        const result = store.createUser({ deviceId, nickname, avatarId, creator });
        user = result.user;
        token = result.token;
        created = true;
      }
      store.updateUser(user, {
        nickname,
        displayName: displayName(nickname, creator),
        avatarId,
        creator,
        model,
        lastIp: ip,
        lastIpAt: Date.now(),
      });
      sendJson(res, 200, {
        ok: true,
        created,
        userId: user.id,
        token,
        nickname: user.nickname,
        displayName: user.displayName,
        avatarId: user.avatarId,
        creator: user.creator,
      });
      return;
    }

    // Загрузка фото отдельным HTTP-запросом. Так большой base64-кадр не
    // блокирует WebSocket, и текст в любом чате уходит сразу.
    if (pathname === '/api/media' && req.method === 'POST') {
      if (!allowIp(ip, 120)) return sendJson(res, 429, { ok: false, error: 'rate_limited' });
      const user = store.findByToken(url.searchParams.get('token') || bearerToken(req));
      if (!user) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      const ban = store.findBan({ deviceId: user.deviceId, ip });
      if (ban) {
        return sendJson(res, 403, {
          ok: false,
          error: 'banned',
          message: 'Доступ заблокирован администратором',
        });
      }
      const buffer = await readBody(req, MAX_IMAGE_BYTES);
      const ext = sniffImage(buffer);
      if (!ext) {
        return sendJson(res, 400, { ok: false, error: 'bad_image' });
      }
      const fileName = `${crypto.randomUUID()}.${ext}`;
      try {
        fs.writeFileSync(path.join(mediaDir, fileName), buffer);
      } catch (err) {
        log('media upload error:', err.message);
        return sendJson(res, 500, { ok: false, error: 'media_failed' });
      }
      sendJson(res, 200, { ok: true, path: `/media/${fileName}` });
      return;
    }

    if (pathname === '/api/roster' && req.method === 'GET') {
      if (!allowIp(ip, 120)) return sendJson(res, 429, { ok: false, error: 'rate_limited' });
      const user = store.findByToken(url.searchParams.get('token') || bearerToken(req));
      if (!user) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      const ban = store.findBan({ deviceId: user.deviceId, ip });
      if (ban) return sendJson(res, 403, { ok: false, error: 'banned', message: 'Доступ заблокирован администратором' });
      sendJson(res, 200, { ok: true, ...rosterPayload() });
      return;
    }

    // Поиск людей для кнопки «+». Отдаём только совпадения по нику/имени,
    // а не весь список зарегистрированных пользователей.
    if (pathname === '/api/search' && req.method === 'GET') {
      if (!allowIp(ip, 120)) return sendJson(res, 429, { ok: false, error: 'rate_limited' });
      const user = store.findByToken(url.searchParams.get('token') || bearerToken(req));
      if (!user) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      const ban = store.findBan({ deviceId: user.deviceId, ip });
      if (ban) return sendJson(res, 403, { ok: false, error: 'banned', message: 'Доступ заблокирован администратором' });
      const query = String(url.searchParams.get('q') || '')
        .trim()
        .toLowerCase()
        .slice(0, 48);
      if (query.length < 2) {
        return sendJson(res, 200, { ok: true, users: [] });
      }
      const users = Object.values(store.db.users)
        .filter((candidate) => candidate.id !== user.id)
        .filter((candidate) => {
          const nickname = String(candidate.nickname || '').toLowerCase();
          const displayName = String(candidate.displayName || '').toLowerCase();
          return candidate.id.toLowerCase() === query ||
            nickname.includes(query) ||
            displayName.includes(query);
        })
        .slice(0, 20)
        .map(publicUser);
      sendJson(res, 200, { ok: true, users });
      return;
    }

    if (pathname === '/api/history' && req.method === 'GET') {
      if (!allowIp(ip, 120)) return sendJson(res, 429, { ok: false, error: 'rate_limited' });
      const user = store.findByToken(url.searchParams.get('token') || bearerToken(req));
      if (!user) return sendJson(res, 401, { ok: false, error: 'unauthorized' });
      const ban = store.findBan({ deviceId: user.deviceId, ip });
      if (ban) return sendJson(res, 403, { ok: false, error: 'banned', message: 'Доступ заблокирован администратором' });
      const rawPeer = url.searchParams.get('peer');
      let peer = null;
      if (rawPeer && rawPeer !== 'lobby') {
        peer = rawPeer.slice(0, 64);
        if (!store.getUser(peer)) return sendJson(res, 404, { ok: false, error: 'unknown_user' });
      }
      const messages = store.history({
        userId: user.id,
        peer,
        limit: url.searchParams.get('limit'),
        before: url.searchParams.get('before'),
      });
      sendJson(res, 200, { ok: true, peer: peer || 'lobby', messages });
      return;
    }

    if (pathname === '/download/UltraChat.apk' || pathname === '/UltraChat.apk') {
      serveApk(req, res);
      return;
    }

    if (pathname === '/' || pathname === '/index.html' || pathname === '/app') {
      serveFile(res, path.join(publicDir, 'index.html'), 'text/html; charset=utf-8');
      return;
    }

    // Короткая страница установки: удобно открыть с телефона по локальному IP.
    if (pathname === '/install' || pathname === '/install.html' || pathname === '/download') {
      serveFile(res, path.join(publicDir, 'install.html'), 'text/html; charset=utf-8');
      return;
    }

    if (pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname.startsWith('/public/')) {
      const target = path.resolve(publicDir, pathname.slice('/public/'.length));
      if (!target.startsWith(path.resolve(publicDir) + path.sep)) {
        return sendJson(res, 403, { ok: false, error: 'forbidden' });
      }
      serveFile(res, target);
      return;
    }

    if (pathname.startsWith('/media/')) {
      const name = pathname.slice('/media/'.length);
      if (!/^[a-z0-9_-]+\.(jpg|png|webp)$/i.test(name)) {
        return sendJson(res, 404, { ok: false, error: 'not_found' });
      }
      serveFile(res, path.join(mediaDir, name), undefined, 'public, max-age=31536000');
      return;
    }

    sendJson(res, 404, { ok: false, error: 'not_found' });
  }

  function serveFile(res, filePath, contentType, cacheControl) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return sendJson(res, 404, { ok: false, error: 'not_found' });
    }
    if (!stat.isFile()) return sendJson(res, 404, { ok: false, error: 'not_found' });
    res.writeHead(200, {
      'Content-Type': contentType || contentTypeFor(filePath),
      'Content-Length': stat.size,
      'Cache-Control': cacheControl || 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  }

  function serveApk(req, res) {
    let stat;
    try {
      stat = fs.statSync(apkPath);
    } catch {
      return sendJson(res, 404, { ok: false, error: 'apk_not_found' });
    }
    const range = req.headers.range;
    if (typeof range === 'string' && /^bytes=\d*-\d*$/.test(range)) {
      const [startRaw, endRaw] = range.replace('bytes=', '').split('-');
      let start = startRaw ? Number(startRaw) : 0;
      let end = endRaw ? Number(endRaw) : stat.size - 1;
      if (!Number.isFinite(start) || start < 0) start = 0;
      if (!Number.isFinite(end) || end >= stat.size) end = stat.size - 1;
      if (start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Disposition': 'attachment; filename="UltraChat.apk"',
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(apkPath, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="UltraChat.apk"',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(apkPath).pipe(res);
  }

  // -------------------------------------------------------------------
  // WebSocket protocol
  // -------------------------------------------------------------------

  function handleFrame(ws, raw) {
    let frame;
    try {
      frame = JSON.parse(raw);
    } catch {
      return send(ws, { v: VERSION, type: 'error', code: 'bad_json', message: 'Некорректный JSON' });
    }
    if (!frame || typeof frame !== 'object' || frame.v !== VERSION) {
      return send(ws, { v: VERSION, type: 'error', code: 'bad_version', message: 'Нужна версия 1' });
    }
    if (frame.type === 'hello') {
      handleHello(ws, frame);
      return;
    }
    if (!ws.helloDone) {
      return send(ws, { v: VERSION, type: 'error', code: 'hello_required', message: 'Сначала HELLO' });
    }
    switch (frame.type) {
      case 'chat':
        handleChat(ws, frame);
        break;
      case 'history':
        handleHistory(ws, frame);
        break;
      case 'typing':
        handleTyping(ws, frame);
        break;
      case 'read':
        handleRead(ws, frame);
        break;
      case 'edit':
        handleEdit(ws, frame);
        break;
      case 'delete':
        handleDelete(ws, frame);
        break;
      case 'delete_chat':
        handleDeleteChat(ws, frame);
        break;
      case 'ping':
        send(ws, { v: VERSION, type: 'pong', ts: frame.ts || Date.now() });
        break;
      case 'pong':
        break;
      default:
        send(ws, { v: VERSION, type: 'error', code: 'unknown_type', message: 'Неизвестный тип' });
    }
  }

  function handleHello(ws, frame) {
    const user = ws.user;
    const deviceId = String(frame.deviceId || '').slice(0, MAX_DEVICE_ID);
    if (deviceId !== user.deviceId) {
      send(ws, { v: VERSION, type: 'error', code: 'device_mismatch', message: 'Чужой токен' });
      ws.close(4003, 'device mismatch');
      return;
    }
    const helloBan = store.findBan({ deviceId: user.deviceId, ip: ws.remoteIp });
    if (helloBan) {
      send(ws, {
        v: VERSION,
        type: 'error',
        code: 'banned',
        message: 'Доступ заблокирован администратором',
      });
      ws.close(4004, 'banned');
      return;
    }
    if (user.lastIp !== ws.remoteIp) {
      store.updateUser(user, { lastIp: ws.remoteIp, lastIpAt: Date.now() });
    }
    const nickname = normalizeNickname(frame.nickname) || user.nickname;
    const creator = frame.creator === true;
    const avatarId = normalizeAvatar(frame.avatar);
    store.updateUser(user, {
      nickname,
      displayName: displayName(nickname, creator),
      creator,
      avatarId,
      model: String(frame.model || '').slice(0, 64),
    });
    ws.helloDone = true;
    clearTimeout(ws.helloTimeout);
    send(ws, {
      v: VERSION,
      type: 'welcome',
      userId: user.id,
      nickname: user.nickname,
      displayName: user.displayName,
      creator: user.creator,
      avatar: user.avatarId,
      online: onlineCount(),
      serverTime: Date.now(),
    });
    send(ws, {
      v: VERSION,
      type: 'history',
      peer: 'lobby',
      messages: store.history({ userId: user.id, peer: null, limit: 50 }),
    });
    const notice = store.getNotice();
    if (notice && Date.now() - Number(notice.createdAt || 0) < NOTICE_TTL_MS) {
      send(ws, { v: VERSION, type: 'notice', ...notice });
    }
    // Догоняем личные переписки, пока устройство было офлайн.
    const pendingPeers = new Set();
    for (const message of store.db.messages) {
      if (message.to === user.id && message.from !== user.id) pendingPeers.add(message.from);
    }
    for (const peerId of pendingPeers) {
      if (!store.getUser(peerId)) continue;
      send(ws, {
        v: VERSION,
        type: 'history',
        peer: peerId,
        messages: store.history({ userId: user.id, peer: peerId, limit: 50 }),
      });
    }
    broadcastRoster();
  }

  function handleChat(ws, frame) {
    const now = Date.now();
    if (now - ws.windowStart > RATE_WINDOW_MS) {
      ws.windowStart = now;
      ws.windowCount = 0;
    }
    ws.windowCount += 1;
    if (ws.windowCount > RATE_MAX_MESSAGES) {
      return send(ws, {
        v: VERSION,
        type: 'error',
        code: 'rate_limited',
        message: 'Слишком часто. Подождите пару секунд.',
      });
    }

    const kind = frame.kind === 'image' ? 'image' : 'text';
    const text = String(frame.text || '').trim().slice(0, MAX_TEXT);
    let imagePath = null;
    if (kind === 'image') {
      // Новый клиент сначала загружает фото через POST /api/media и присылает
      // готовый путь. Старый клиент по-прежнему может прислать base64.
      const media = typeof frame.media === 'string' ? frame.media.trim() : '';
      if (media) {
        const name = media.startsWith('/media/') ? media.slice('/media/'.length) : '';
        if (!/^[a-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(name)) {
          return send(ws, {
            v: VERSION,
            type: 'error',
            code: 'bad_image',
            message: 'Фото не принято: неверная ссылка',
          });
        }
        if (!fs.existsSync(path.join(mediaDir, name))) {
          return send(ws, {
            v: VERSION,
            type: 'error',
            code: 'bad_image',
            message: 'Фото не найдено, загрузите заново',
          });
        }
        imagePath = `/media/${name}`;
      } else {
        const parsed = parseImagePayload(frame.image);
        if (!parsed) {
          return send(ws, {
            v: VERSION,
            type: 'error',
            code: 'bad_image',
            message: 'Фото не принято: нужен JPEG, PNG или WebP до 1,8 МБ',
          });
        }
        const fileName = `${crypto.randomUUID()}.${parsed.ext}`;
        try {
          fs.writeFileSync(path.join(mediaDir, fileName), parsed.buffer);
        } catch (err) {
          log('media write error:', err.message);
          return send(ws, {
            v: VERSION,
            type: 'error',
            code: 'media_failed',
            message: 'Не удалось сохранить фото',
          });
        }
        imagePath = `/media/${fileName}`;
      }
    } else if (!text) {
      return send(ws, { v: VERSION, type: 'error', code: 'empty_text', message: 'Пустое сообщение' });
    }
    let to = frame.to ? String(frame.to).slice(0, 64) : null;
    if (to === ws.user.id) {
      return send(ws, { v: VERSION, type: 'error', code: 'self_message', message: 'Нельзя писать себе' });
    }
    if (to && !store.getUser(to)) {
      return send(ws, { v: VERSION, type: 'error', code: 'unknown_user', message: 'Получатель не найден' });
    }
    const id = String(frame.id || '').slice(0, 96) || crypto.randomUUID();
    let ts = Number(frame.ts);
    if (!Number.isFinite(ts) || Math.abs(ts - now) > 5 * 60_000) ts = now;

    const message = {
      id,
      from: ws.user.id,
      to,
      sender: ws.user.displayName,
      creator: !!ws.user.creator,
      text,
      kind,
      image: imagePath,
      ts,
      readAt: 0,
      editedAt: 0,
    };
    store.addMessage(message);

    let delivered = false;
    if (to) {
      for (const target of online.get(to) || []) {
        if (target.readyState === WebSocket.OPEN) {
          send(target, publicMessage(message));
          delivered = true;
        }
      }
      for (const own of online.get(ws.user.id) || []) {
        if (own !== ws && own.readyState === WebSocket.OPEN) send(own, publicMessage(message));
      }
    } else {
      broadcast(publicMessage(message), ws);
      delivered = true;
    }
    send(ws, { v: VERSION, type: 'ack', id, ts, delivered });
  }

  function handleHistory(ws, frame) {
    const rawPeer = frame.peer;
    let peer = null;
    if (rawPeer && rawPeer !== 'lobby') {
      peer = String(rawPeer).slice(0, 64);
      if (!store.getUser(peer)) {
        return send(ws, { v: VERSION, type: 'error', code: 'unknown_user', message: 'Пользователь не найден' });
      }
    }
    send(ws, {
      v: VERSION,
      type: 'history',
      peer: peer || 'lobby',
      messages: store.history({
        userId: ws.user.id,
        peer,
        limit: frame.limit,
        before: frame.before,
      }),
    });
  }

  function handleTyping(ws, frame) {
    const to = frame.to ? String(frame.to).slice(0, 64) : null;
    if (!to || to === ws.user.id) return;
    const payload = { v: VERSION, type: 'typing', from: ws.user.id, to };
    for (const target of online.get(to) || []) {
      if (target.readyState === WebSocket.OPEN) send(target, payload);
    }
  }

  function handleRead(ws, frame) {
    const peer = frame.peer ? String(frame.peer).slice(0, 64) : '';
    if (!peer || peer === ws.user.id) return;
    if (!store.getUser(peer)) {
      return send(ws, {
        v: VERSION,
        type: 'error',
        code: 'unknown_user',
        message: 'Пользователь не найден',
      });
    }
    const result = store.markRead({
      userId: ws.user.id,
      peer,
      upTo: frame.upTo,
    });
    if (result.changed === 0) return;
    const payload = {
      v: VERSION,
      type: 'read',
      peer: ws.user.id,
      upTo: result.upTo,
      at: Date.now(),
    };
    for (const target of online.get(peer) || []) {
      if (target.readyState === WebSocket.OPEN) send(target, payload);
    }
  }

  function handleEdit(ws, frame) {
    const id = frame.id ? String(frame.id).slice(0, 96) : '';
    const text = String(frame.text || '').trim().slice(0, MAX_TEXT);
    if (!id || !text) {
      return send(ws, {
        v: VERSION,
        type: 'error',
        code: 'empty_text',
        message: 'Пустое сообщение',
      });
    }
    const message = store.editMessage({ userId: ws.user.id, id, text });
    if (!message) {
      return send(ws, {
        v: VERSION,
        type: 'error',
        code: 'message_not_editable',
        message: 'Это сообщение нельзя изменить',
      });
    }
    const payload = {
      v: VERSION,
      type: 'edit',
      id: message.id,
      text: message.text,
      editedAt: message.editedAt,
      from: message.from,
      to: message.to,
    };
    if (message.to) {
      for (const userId of new Set([message.from, message.to])) {
        for (const target of online.get(userId) || []) {
          if (target.readyState === WebSocket.OPEN) send(target, payload);
        }
      }
    } else {
      broadcast(payload);
    }
  }

  function handleDelete(ws, frame) {
    const id = frame.id ? String(frame.id).slice(0, 96) : '';
    if (!id) return;
    const message = store.deleteMessage({ userId: ws.user.id, id });
    if (!message) {
      return send(ws, {
        v: VERSION,
        type: 'error',
        code: 'message_not_found',
        message: 'Сообщение уже удалено',
      });
    }
    removeMedia(message.image);
    const payload = {
      v: VERSION,
      type: 'delete',
      id: message.id,
      from: message.from,
      to: message.to,
    };
    if (message.to) {
      for (const userId of new Set([message.from, message.to])) {
        for (const target of online.get(userId) || []) {
          if (target.readyState === WebSocket.OPEN) send(target, payload);
        }
      }
    } else {
      broadcast(payload);
    }
  }

  function handleDeleteChat(ws, frame) {
    const peer = frame.peer ? String(frame.peer).slice(0, 64) : '';
    if (!peer || peer === ws.user.id) return;
    if (!store.getUser(peer)) {
      return send(ws, {
        v: VERSION,
        type: 'error',
        code: 'unknown_user',
        message: 'Пользователь не найден',
      });
    }
    const removed = store.deleteConversation({ userId: ws.user.id, peer });
    for (const message of removed) removeMedia(message.image);
    // Инициатор уже очистил чат локально. Собеседнику сообщаем отдельно,
    // чтобы его копия истории тоже исчезла.
    const payload = { v: VERSION, type: 'chat_deleted', peer: ws.user.id };
    for (const target of online.get(peer) || []) {
      if (target.readyState === WebSocket.OPEN) send(target, payload);
    }
  }

  function removeMedia(imagePath) {
    if (typeof imagePath !== 'string' || !imagePath.startsWith('/media/')) return;
    const name = path.basename(imagePath);
    if (!/^[a-z0-9_-]+\.(jpg|png|webp)$/i.test(name)) return;
    try {
      fs.unlinkSync(path.join(mediaDir, name));
    } catch {
      /* файл мог быть уже удалён */
    }
  }

  function publicMessage(message) {
    return {
      v: VERSION,
      type: 'chat',
      id: message.id,
      from: message.from,
      to: message.to,
      sender: message.sender,
      creator: message.creator,
      text: message.text,
      kind: message.kind === 'image' ? 'image' : 'text',
      image: message.image || null,
      ts: message.ts,
      readAt: message.readAt || 0,
      editedAt: message.editedAt || 0,
    };
  }

  function send(ws, payload) {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  function broadcast(payload, except) {
    const data = JSON.stringify(payload);
    for (const ws of wss.clients) {
      if (ws === except || !ws.helloDone || ws.readyState !== WebSocket.OPEN) continue;
      try {
        ws.send(data);
      } catch {
        /* ignore */
      }
    }
  }

  function publicUser(u) {
    return {
      id: u.id,
      nickname: u.nickname,
      displayName: u.displayName,
      creator: !!u.creator,
      avatar: u.avatarId,
      model: u.model || '',
      online: (online.get(u.id)?.size || 0) > 0,
      lastSeenAt: u.lastSeenAt || 0,
    };
  }

  function rosterPayload() {
    const users = Object.values(store.db.users).map(publicUser);
    users.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.displayName.localeCompare(b.displayName, 'ru');
    });
    return {
      v: VERSION,
      type: 'roster',
      users,
      online: users.filter((u) => u.online).length,
      serverTime: Date.now(),
    };
  }

  function broadcastRoster() {
    const payload = rosterPayload();
    const data = JSON.stringify(payload);
    for (const ws of wss.clients) {
      if (!ws.helloDone || ws.readyState !== WebSocket.OPEN) continue;
      try {
        ws.send(data);
      } catch {
        /* ignore */
      }
    }
  }

  function onlineCount() {
    let count = 0;
    for (const set of online.values()) {
      for (const ws of set) {
        if (ws.helloDone) {
          count += 1;
          break;
        }
      }
    }
    return count;
  }

  function allowIp(ip, maxPerMinute) {
    const now = Date.now();
    let entry = ipHits.get(ip);
    if (!entry || now - entry.start > 60_000) {
      entry = { start: now, count: 0 };
      ipHits.set(ip, entry);
    }
    entry.count += 1;
    return entry.count <= maxPerMinute;
  }

  /** Отдельный счётчик, чтобы обычные запросы не расходовали лимит входа в панель. */
  function allowAdmin(ip, maxPerMinute) {
    const now = Date.now();
    let entry = adminHits.get(ip);
    if (!entry || now - entry.start > 60_000) {
      entry = { start: now, count: 0 };
      adminHits.set(ip, entry);
    }
    entry.count += 1;
    return entry.count <= maxPerMinute;
  }

  const ipCleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of ipHits) {
      if (now - entry.start > 5 * 60_000) ipHits.delete(ip);
    }
    for (const [ip, entry] of adminHits) {
      if (now - entry.start > 5 * 60_000) adminHits.delete(ip);
    }
    for (const [token, session] of adminSessions) {
      if (session.expiresAt <= now) adminSessions.delete(token);
    }
  }, 60_000);
  if (typeof ipCleanup.unref === 'function') ipCleanup.unref();

  function close() {
    clearInterval(heartbeat);
    clearInterval(ipCleanup);
    for (const ws of wss.clients) {
      try {
        ws.close(1001, 'server shutdown');
      } catch {
        /* ignore */
      }
    }
    store.saveNow();
    return new Promise((resolve) => {
      wss.close(() => server.close(() => resolve()));
    });
  }

  function listen(port, host) {
    return new Promise((resolve, reject) => {
      // Туннели (localtunnel/cloudflared) переиспользуют соединения.
      // Держим keep-alive дольше, чтобы прокси не получал закрытые сокеты.
      server.keepAliveTimeout = 65_000;
      server.headersTimeout = 66_000;
      server.requestTimeout = 120_000;
      server.once('error', reject);
      server.listen(port, host, () => {
        server.removeListener('error', reject);
        resolve(server.address());
      });
    });
  }

  return { server, wss, store, listen, close, onlineCount };
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

module.exports = { createApp, VERSION, MAX_TEXT };
