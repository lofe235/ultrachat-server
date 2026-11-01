'use strict';

const path = require('node:path');
const { createApp } = require('./app');

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const apkPath = process.env.APK_PATH || undefined;

const app = createApp({ dataDir, apkPath });

app.listen(port, host)
  .then((address) => {
    const shownHost = host === '0.0.0.0' ? 'localhost' : host;
    console.log('');
    console.log('  UltraChat Server');
    console.log(`  http://${shownHost}:${address.port}`);
    console.log(`  данные: ${dataDir}`);
    console.log('');
  })
  .catch((err) => {
    console.error('Не удалось запустить сервер:', err.message);
    process.exit(1);
  });

let closing = false;

async function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`\n${signal}: останавливаю сервер…`);
  const timer = setTimeout(() => process.exit(1), 5000);
  timer.unref();
  try {
    await app.close();
  } finally {
    clearTimeout(timer);
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('Необработанная ошибка:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Необработанный reject:', err);
});
