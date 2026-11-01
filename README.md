---
title: UltraChat Server
emoji: 💬
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 8080
pinned: false
---

# UltraChat Server

Relay-сервер UltraChat: аккаунты, присутствие, личные сообщения, история и WebSocket.

- `GET /health` — проверка живости
- `GET /api/search?q=` — поиск пользователей
- `WS /ws` — основной протокол чата
- `GET /install` — страница установки APK

Данные хранятся в `/data` и сбрасываются при перезапуске бесплатного Space.
