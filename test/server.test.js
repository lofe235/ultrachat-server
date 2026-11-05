'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WebSocket = require('ws');
const { createApp } = require('../src/app');

let app;
let base;
let wsBase;
let dataDir;
const ADMIN_PASSWORD = 'test-admin-password';

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ultrachat-test-'));
  fs.writeFileSync(path.join(dataDir, 'admin-password.txt'), `${ADMIN_PASSWORD}\n`, 'utf8');
  app = createApp({ dataDir, apkPath: path.join(dataDir, 'missing.apk') });
  const address = await app.listen(0, '127.0.0.1');
  base = `http://127.0.0.1:${address.port}`;
  wsBase = `ws://127.0.0.1:${address.port}`;
});

after(async () => {
  await app.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

let deviceCounter = 0;

async function register(nickname, extra = {}) {
  deviceCounter += 1;
  const deviceId = `test-device-${deviceCounter}-${Date.now()}`;
  const response = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      nickname,
      avatarId: 'fox',
      ...extra,
    }),
  });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.ok, true);
  assert.ok(data.token);
  return { ...data, deviceId };
}

class Client {
  constructor(ws) {
    this.ws = ws;
    this.buffer = [];
    this.waiters = [];
    ws.on('message', (raw) => {
      const frame = JSON.parse(raw.toString('utf8'));
      const index = this.waiters.findIndex(
        (w) => w.type === frame.type && (!w.pred || w.pred(frame)),
      );
      if (index >= 0) {
        const waiter = this.waiters.splice(index, 1)[0];
        clearTimeout(waiter.timer);
        waiter.resolve(frame);
      } else {
        this.buffer.push(frame);
      }
    });
  }

  static open(token) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${wsBase}/ws?token=${encodeURIComponent(token)}`);
      const timer = setTimeout(() => reject(new Error('ws open timeout')), 3000);
      ws.once('open', () => {
        clearTimeout(timer);
        resolve(new Client(ws));
      });
      ws.once('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  send(frame) {
    this.ws.send(JSON.stringify({ v: 1, ...frame }));
  }

  next(type, pred, timeout = 3000) {
    const index = this.buffer.findIndex(
      (f) => f.type === type && (!pred || pred(f)),
    );
    if (index >= 0) return Promise.resolve(this.buffer.splice(index, 1)[0]);
    return new Promise((resolve, reject) => {
      const waiter = { type, pred, resolve };
      waiter.timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(new Error(`timeout waiting for ${type}`));
      }, timeout);
      this.waiters.push(waiter);
    });
  }

  async hello(account, overrides = {}) {
    this.send({
      type: 'hello',
      deviceId: account.deviceId || `ignored-${account.userId}`,
      nickname: account.nickname,
      creator: !!account.creator,
      avatar: 'fox',
      model: 'test',
      ...overrides,
    });
    return this.next('welcome');
  }

  close() {
    return new Promise((resolve) => {
      this.ws.once('close', resolve);
      this.ws.close();
    });
  }
}

async function connect(account) {
  const client = await Client.open(account.token);
  await client.hello(account);
  return client;
}

test('health reports service state', async () => {
  const response = await fetch(`${base}/health`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.name, 'UltraChat');
  assert.equal(data.apk, false);
});

test('registration issues a stable token for the same device', async () => {
  const first = await register('Алиса');
  const again = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: first.deviceId,
      nickname: 'Алиса',
      token: first.token,
    }),
  });
  const data = await again.json();
  assert.equal(again.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.created, false);
  assert.equal(data.userId, first.userId);
  assert.equal(data.token, first.token);
});

test('search returns only matching users and requires auth', async () => {
  const alice = await register('Поиск-Алиса');
  const bob = await register('Поиск-Боб');
  await register('Совсем-другой');

  const unauthorized = await fetch(`${base}/api/search?q=Поиск`);
  assert.equal(unauthorized.status, 401);

  const response = await fetch(
    `${base}/api/search?q=${encodeURIComponent('Поиск')}&token=${encodeURIComponent(alice.token)}`,
  );
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  const ids = data.users.map((user) => user.id);
  assert.ok(ids.includes(bob.userId));
  assert.ok(!ids.includes(alice.userId));
  assert.equal(ids.length, 1);

  const short = await fetch(
    `${base}/api/search?q=П&token=${encodeURIComponent(alice.token)}`,
  );
  const shortData = await short.json();
  assert.deepEqual(shortData.users, []);
});

test('register + hello + roster + direct message', async () => {
  const alice = await register('Алиса');
  const bob = await register('Боб');
  const clientA = await connect(alice);
  const clientB = await connect(bob);

  const roster = await clientA.next(
    'roster',
    (f) => f.users.some((u) => u.id === bob.userId && u.online === true),
  );
  assert.ok(roster.users.some((u) => u.id === alice.userId));
  assert.ok(roster.users.some((u) => u.id === bob.userId && u.online === true));

  clientA.send({
    type: 'chat',
    id: 'dm-1',
    to: bob.userId,
    text: 'Привет, Боб!',
    ts: Date.now(),
  });

  const received = await clientB.next('chat', (f) => f.id === 'dm-1');
  assert.equal(received.from, alice.userId);
  assert.equal(received.to, bob.userId);
  assert.equal(received.text, 'Привет, Боб!');
  assert.equal(received.creator, false);

  const ack = await clientA.next('ack', (f) => f.id === 'dm-1');
  assert.equal(ack.delivered, true);

  const historyResponse = await fetch(
    `${base}/api/history?peer=${alice.userId}&token=${encodeURIComponent(bob.token)}`,
  );
  const history = await historyResponse.json();
  assert.equal(history.ok, true);
  assert.equal(history.messages.length, 1);
  assert.equal(history.messages[0].text, 'Привет, Боб!');

  await clientA.close();
  await clientB.close();
});

test('offline direct message is stored and delivered on reconnect', async () => {
  const alice = await register('Алиса Оффлайн');
  const bob = await register('Боб Оффлайн');

  const clientA = await connect(alice);
  clientA.send({
    type: 'chat',
    id: 'offline-1',
    to: bob.userId,
    text: 'Прочитаешь позже',
    ts: Date.now(),
  });
  const ack = await clientA.next('ack', (f) => f.id === 'offline-1');
  assert.equal(ack.delivered, false);

  const clientB = await connect(bob);
  clientB.send({ type: 'history', peer: alice.userId, limit: 20 });
  const history = await clientB.next('history', (f) => f.peer === alice.userId);
  assert.equal(history.messages.length, 1);
  assert.equal(history.messages[0].id, 'offline-1');

  await clientA.close();
  await clientB.close();
});

test('read receipt is delivered and stored in history', async () => {
  const alice = await register('Алиса Читает');
  const bob = await register('Боб Читает');
  const clientA = await connect(alice);
  const clientB = await connect(bob);

  const ts = Date.now();
  clientA.send({
    type: 'chat',
    id: 'read-1',
    to: bob.userId,
    text: 'Прочитай меня',
    ts,
  });
  const incoming = await clientB.next('chat', (f) => f.id === 'read-1');
  assert.equal(incoming.readAt, 0);
  await clientA.next('ack', (f) => f.id === 'read-1');

  clientB.send({ type: 'read', peer: alice.userId, upTo: ts });
  const receipt = await clientA.next(
    'read',
    (f) => f.peer === bob.userId && f.upTo === ts,
  );
  assert.equal(receipt.upTo, ts);

  const historyResponse = await fetch(
    `${base}/api/history?peer=${bob.userId}&token=${encodeURIComponent(alice.token)}`,
  );
  const history = await historyResponse.json();
  const stored = history.messages.find((message) => message.id === 'read-1');
  assert.ok(stored, 'message should be in history');
  assert.ok(stored.readAt > 0, 'readAt should be stored');

  await clientA.close();
  await clientB.close();
});

test('edit and delete update both clients and server history', async () => {
  const alice = await register('Алиса Редакт');
  const bob = await register('Боб Редакт');
  const clientA = await connect(alice);
  const clientB = await connect(bob);

  const ts = Date.now();
  clientA.send({
    type: 'chat',
    id: 'edit-1',
    to: bob.userId,
    text: 'Старый текст',
    ts,
  });
  await clientB.next('chat', (f) => f.id === 'edit-1');
  await clientA.next('ack', (f) => f.id === 'edit-1');

  clientA.send({ type: 'edit', id: 'edit-1', text: 'Новый текст' });
  const editedForBob = await clientB.next('edit', (f) => f.id === 'edit-1');
  const editedForAlice = await clientA.next('edit', (f) => f.id === 'edit-1');
  assert.equal(editedForBob.text, 'Новый текст');
  assert.equal(editedForAlice.text, 'Новый текст');
  assert.ok(editedForBob.editedAt > 0);

  // Чужое сообщение редактировать нельзя.
  clientB.send({ type: 'edit', id: 'edit-1', text: 'Взлом' });
  const forbidden = await clientB.next('error', (f) => f.code === 'message_not_editable');
  assert.equal(forbidden.code, 'message_not_editable');

  let historyResponse = await fetch(
    `${base}/api/history?peer=${alice.userId}&token=${encodeURIComponent(bob.token)}`,
  );
  let history = await historyResponse.json();
  assert.equal(history.messages[0].text, 'Новый текст');

  clientA.send({ type: 'delete', id: 'edit-1' });
  await clientB.next('delete', (f) => f.id === 'edit-1');
  await clientA.next('delete', (f) => f.id === 'edit-1');

  historyResponse = await fetch(
    `${base}/api/history?peer=${alice.userId}&token=${encodeURIComponent(bob.token)}`,
  );
  history = await historyResponse.json();
  assert.equal(history.messages.length, 0);

  await clientA.close();
  await clientB.close();
});

test('delete chat clears history for both participants', async () => {
  const alice = await register('Алиса Удаляет');
  const bob = await register('Боб Удаляет');
  const clientA = await connect(alice);
  const clientB = await connect(bob);

  const ts = Date.now();
  clientA.send({
    type: 'chat',
    id: 'chat-delete-1',
    to: bob.userId,
    text: 'Удалим чат',
    ts,
  });
  await clientB.next('chat', (f) => f.id === 'chat-delete-1');
  await clientA.next('ack', (f) => f.id === 'chat-delete-1');

  clientA.send({ type: 'delete_chat', peer: bob.userId });
  const deleted = await clientB.next(
    'chat_deleted',
    (f) => f.peer === alice.userId,
  );
  assert.equal(deleted.peer, alice.userId);

  for (const account of [alice, bob]) {
    const peer = account.userId === alice.userId ? bob.userId : alice.userId;
    const response = await fetch(
      `${base}/api/history?peer=${peer}&token=${encodeURIComponent(account.token)}`,
    );
    const history = await response.json();
    assert.equal(history.messages.length, 0);
  }

  await clientA.close();
  await clientB.close();
});

test('lobby broadcasts to everyone except sender and stores history', async () => {
  const alice = await register('Алиса Лобби');
  const bob = await register('Боб Лобби');
  const clientA = await connect(alice);
  const clientB = await connect(bob);

  clientA.send({
    type: 'chat',
    id: 'lobby-1',
    text: 'Всем привет',
    ts: Date.now(),
  });
  const received = await clientB.next('chat', (f) => f.id === 'lobby-1');
  assert.equal(received.from, alice.userId);
  assert.equal(received.to, null);

  const ack = await clientA.next('ack', (f) => f.id === 'lobby-1');
  assert.equal(ack.delivered, true);

  // Отправитель не должен получить своё же сообщение обратно.
  await assert.rejects(clientA.next('chat', (f) => f.id === 'lobby-1', 500));

  clientB.send({ type: 'history', peer: 'lobby', limit: 50 });
  const history = await clientB.next(
    'history',
    (f) => f.peer === 'lobby' && f.messages.some((m) => m.id === 'lobby-1'),
  );
  assert.ok(history.messages.some((m) => m.id === 'lobby-1'));

  await clientA.close();
  await clientB.close();
});

test('hello is mandatory and device id must match the token', async () => {
  const alice = await register('Алиса Проверка');
  const client = await Client.open(alice.token);

  client.send({ type: 'chat', id: 'early', text: 'без hello' });
  const error = await client.next('error');
  assert.equal(error.code, 'hello_required');

  client.send({
    type: 'hello',
    deviceId: 'чужая-устройство',
    nickname: 'Алиса',
  });
  const mismatch = await client.next('error');
  assert.equal(mismatch.code, 'device_mismatch');

  await client.close();
});

test('bad token is rejected at websocket handshake', async () => {
  await assert.rejects(Client.open('not-a-real-token'));
});

test('empty text is rejected and long text is truncated', async () => {
  const alice = await register('Алиса Текст');
  const bob = await register('Боб Текст');
  const clientA = await connect(alice);
  const clientB = await connect(bob);

  clientA.send({ type: 'chat', id: 'empty-1', to: bob.userId, text: '   ' });
  const emptyError = await clientA.next('error');
  assert.equal(emptyError.code, 'empty_text');

  clientA.send({
    type: 'chat',
    id: 'long-1',
    to: bob.userId,
    text: 'я'.repeat(5000),
    ts: Date.now(),
  });
  const received = await clientB.next('chat', (f) => f.id === 'long-1');
  assert.equal(received.text.length, 4000);

  await clientA.close();
  await clientB.close();
});

test('ping is answered with pong', async () => {
  const alice = await register('Алиса Пинг');
  const client = await connect(alice);
  client.send({ type: 'ping', ts: 12345 });
  const pong = await client.next('pong');
  assert.equal(pong.ts, 12345);
  await client.close();
});

test('typing is forwarded only to the recipient', async () => {
  const alice = await register('Алиса Печатает');
  const bob = await register('Боб Печатает');
  const clientA = await connect(alice);
  const clientB = await connect(bob);

  clientA.send({ type: 'typing', to: bob.userId });
  const typing = await clientB.next('typing');
  assert.equal(typing.from, alice.userId);
  assert.equal(typing.to, bob.userId);

  await clientA.close();
  await clientB.close();
});

test('web page is served', async () => {
  const response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /UltraChat/);
  assert.match(html, /\/public\/app\.js/);
});

async function adminLogin(password = ADMIN_PASSWORD) {
  const response = await fetch(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await response.json();
  return { response, data };
}

function adminHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

test('admin panel requires the configured password', async () => {
  const wrong = await adminLogin('definitely-wrong');
  assert.equal(wrong.response.status, 403);
  assert.equal(wrong.data.error, 'bad_password');

  const stateUnauthorized = await fetch(`${base}/api/admin/state`);
  assert.equal(stateUnauthorized.status, 401);

  const right = await adminLogin();
  assert.equal(right.response.status, 200);
  assert.equal(right.data.ok, true);
  assert.ok(right.data.token);

  const stateResponse = await fetch(`${base}/api/admin/state`, {
    headers: { Authorization: `Bearer ${right.data.token}` },
  });
  const state = await stateResponse.json();
  assert.equal(stateResponse.status, 200);
  assert.equal(state.ok, true);
  assert.ok(state.stats.users > 0);
  assert.ok(Array.isArray(state.users));
  assert.ok(state.users.every((user) => typeof user.deviceId === 'string'));
});

test('admin notice is broadcast and replayed to new connections', async () => {
  const login = await adminLogin();
  const token = login.data.token;
  const noticeResponse = await fetch(`${base}/api/admin/notice`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({
      title: 'Доступно обновление',
      text: 'Установите новую версию UltraChat.',
      version: '9.9.9',
      url: '/download/UltraChat.apk',
    }),
  });
  const noticeData = await noticeResponse.json();
  assert.equal(noticeResponse.status, 200);
  assert.equal(noticeData.ok, true);
  assert.ok(noticeData.notice.id);

  const alice = await register('Алиса Уведомление');
  const client = await Client.open(alice.token);
  const welcome = await client.hello(alice);
  assert.ok(welcome.userId);
  const notice = await client.next('notice', (frame) => frame.id === noticeData.notice.id);
  assert.equal(notice.version, '9.9.9');
  assert.equal(notice.url, '/download/UltraChat.apk');

  await client.close();
});

test('admin can ban a device and disconnect it', async () => {
  const banned = await register('Забаненный');
  const client = await connect(banned);
  const login = await adminLogin();
  const token = login.data.token;

  const banResponse = await fetch(`${base}/api/admin/ban`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ kind: 'device', value: banned.deviceId, reason: 'тест' }),
  });
  const banData = await banResponse.json();
  assert.equal(banResponse.status, 200);
  assert.equal(banData.ok, true);

  const error = await client.next('error', (frame) => frame.code === 'banned');
  assert.equal(error.code, 'banned');
  await new Promise((resolve) => client.ws.once('close', resolve));

  const retry = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: banned.deviceId, nickname: 'Забаненный' }),
  });
  assert.equal(retry.status, 403);
  const retryData = await retry.json();
  assert.equal(retryData.error, 'banned');

  const unban = await fetch(`${base}/api/admin/unban`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ kind: 'device', value: banned.deviceId }),
  });
  assert.equal(unban.status, 200);
});

test('admin can ban and unban an IP address', async () => {
  const ip = '203.0.113.77';
  const registerFromIp = (deviceId, nickname) => fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ deviceId, nickname }),
  });

  const first = await registerFromIp(`ip-ban-${Date.now()}`, 'IP-Бан');
  assert.equal(first.status, 200);

  const login = await adminLogin();
  const token = login.data.token;
  const ban = await fetch(`${base}/api/admin/ban`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ kind: 'ip', value: ip, reason: 'тест IP' }),
  });
  assert.equal(ban.status, 200);

  const blocked = await registerFromIp(`ip-ban-blocked-${Date.now()}`, 'IP-Бан 2');
  assert.equal(blocked.status, 403);
  const blockedData = await blocked.json();
  assert.equal(blockedData.error, 'banned');

  const unban = await fetch(`${base}/api/admin/unban`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ kind: 'ip', value: ip }),
  });
  assert.equal(unban.status, 200);

  const allowed = await registerFromIp(`ip-ban-allowed-${Date.now()}`, 'IP-Разбанен');
  assert.equal(allowed.status, 200);
});

test('admin can clear the lobby for everyone', async () => {
  const alice = await register('Алиса Очистка');
  const bob = await register('Боб Очистка');
  const clientA = await connect(alice);
  const clientB = await connect(bob);

  // Забираем стартовую историю лобби, иначе следующее ожидание history
  // получит кадр, снятый до очистки.
  await clientA.next('history', (f) => f.peer === 'lobby');
  await clientB.next('history', (f) => f.peer === 'lobby');

  clientA.send({
    type: 'chat',
    id: 'lobby-clear-1',
    text: 'Это сообщение будет очищено',
    ts: Date.now(),
  });
  await clientB.next('chat', (frame) => frame.id === 'lobby-clear-1');
  await clientA.next('ack', (frame) => frame.id === 'lobby-clear-1');

  const login = await adminLogin();
  const response = await fetch(`${base}/api/admin/lobby/clear`, {
    method: 'POST',
    headers: adminHeaders(login.data.token),
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.ok(data.removed >= 1);

  const cleared = await clientB.next('lobby_cleared');
  assert.ok(cleared.at > 0);

  clientB.send({ type: 'history', peer: 'lobby', limit: 50 });
  const history = await clientB.next('history', (frame) => frame.peer === 'lobby');
  assert.equal(history.messages.length, 0);

  await clientA.close();
  await clientB.close();
});

test('admin can delete an account and all its messages', async () => {
  const alice = await register('Алиса Удаление');
  const bob = await register('Боб Удаление');
  const clientA = await connect(alice);
  const clientB = await connect(bob);
  await clientA.next('history', (f) => f.peer === 'lobby');
  await clientB.next('history', (f) => f.peer === 'lobby');

  clientA.send({
    type: 'chat',
    id: 'delete-account-dm',
    to: bob.userId,
    text: 'Привет, Боб',
    ts: Date.now(),
  });
  await clientB.next('chat', (f) => f.id === 'delete-account-dm');
  clientA.send({
    type: 'chat',
    id: 'delete-account-lobby',
    text: 'Сообщение в общий чат',
    ts: Date.now(),
  });
  await clientB.next('chat', (f) => f.id === 'delete-account-lobby');
  clientB.send({
    type: 'chat',
    id: 'delete-account-lobby-bob',
    text: 'Ответ Боба в общий чат',
    ts: Date.now(),
  });
  await clientA.next('chat', (f) => f.id === 'delete-account-lobby-bob');

  const login = await adminLogin();
  const closePromise = new Promise((resolve) => clientB.ws.once('close', (code) => resolve(code)));
  const response = await fetch(`${base}/api/admin/delete-user`, {
    method: 'POST',
    headers: adminHeaders(login.data.token),
    body: JSON.stringify({ userId: bob.userId }),
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.ok(data.removedMessages >= 2);

  const error = await clientB.next('error', (f) => f.code === 'account_deleted');
  assert.equal(error.code, 'account_deleted');
  assert.equal(await closePromise, 4006);

  const stateResponse = await fetch(`${base}/api/admin/state`, {
    headers: adminHeaders(login.data.token),
  });
  const state = await stateResponse.json();
  assert.ok(!state.users.some((user) => user.id === bob.userId));

  const again = await fetch(`${base}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: bob.deviceId, nickname: 'Боб Заново' }),
  });
  const againData = await again.json();
  assert.equal(again.status, 200);
  assert.equal(againData.ok, true);
  assert.notEqual(againData.userId, bob.userId);

  const missing = await fetch(`${base}/api/admin/delete-user`, {
    method: 'POST',
    headers: adminHeaders(login.data.token),
    body: JSON.stringify({ userId: bob.userId }),
  });
  assert.equal(missing.status, 404);

  await clientA.close();
});
