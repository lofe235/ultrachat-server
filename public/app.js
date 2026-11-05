(() => {
  'use strict';

  const VERSION = 1;
  const APP_VERSION = '1.8.0 web';
  const MAX_TEXT = 4000;
  const MAX_NICKNAME = 24;
  const CREATOR_CODE = '2252';
  const CREATOR_PREFIX = '[Создатель]';
  const SECRET_TAPS = 10;
  const TAP_WINDOW_MS = 5000;
  const MAX_MESSAGES_PER_PEER = 300;
  const LOBBY_ID = 'lobby';
  const LOBBY_TITLE = 'Общий чат';
  const ADMIN_TAPS = 5;
  const ADMIN_TAP_WINDOW_MS = 4000;

  const DEFAULT_SERVER = (() => {
    try {
      if (/^https?:$/.test(location.protocol)) return location.origin;
    } catch {
      /* ignore */
    }
    return 'https://ultrachat2026.alwaysdata.net';
  })();

  const STORAGE = {
    device: 'uc_device',
    token: 'uc_token',
    profile: 'uc_profile_v2',
    settings: 'uc_settings_v2',
    threads: 'uc_threads_v2',
    history: 'uc_history_v2:',
  };

  const $ = (id) => document.getElementById(id);
  const q = (selector, root = document) => root.querySelector(selector);

  const THEMES = {
    telegram: {
      label: 'Telegram', description: 'Классическая тёмная', light: false,
      background: '#0E1621', backgroundDeep: '#0A1118', panel: '#17212B',
      panelElevated: '#1C2733', panelSoft: '#243240', line: '#263441',
      textPrimary: '#F4F7FA', textSecondary: '#8A9AA8', textTertiary: '#61707E',
    },
    midnight: {
      label: 'Полночь', description: 'Глубокий синий', light: false,
      background: '#070B14', backgroundDeep: '#04060C', panel: '#0F1622',
      panelElevated: '#151F2E', panelSoft: '#1D2A3D', line: '#223149',
      textPrimary: '#EEF4FF', textSecondary: '#7F91A8', textTertiary: '#586A80',
    },
    graphite: {
      label: 'Графит', description: 'Нейтральный серый', light: false,
      background: '#121417', backgroundDeep: '#0C0E10', panel: '#1A1D21',
      panelElevated: '#22262B', panelSoft: '#2C3137', line: '#343A41',
      textPrimary: '#F2F4F6', textSecondary: '#9AA1A9', textTertiary: '#6E767F',
    },
    ocean: {
      label: 'Океан', description: 'Холодная бирюза', light: false,
      background: '#071A1E', backgroundDeep: '#041012', panel: '#0E252A',
      panelElevated: '#143037', panelSoft: '#1B3D45', line: '#24505A',
      textPrimary: '#EAFBFF', textSecondary: '#7FB3BE', textTertiary: '#5A8A94',
    },
    forest: {
      label: 'Лес', description: 'Спокойный зелёный', light: false,
      background: '#0B1710', backgroundDeep: '#07100B', panel: '#12251A',
      panelElevated: '#193020', panelSoft: '#213D2A', line: '#2B4E36',
      textPrimary: '#F0FBF2', textSecondary: '#8FB39A', textTertiary: '#64806D',
    },
    amethyst: {
      label: 'Аметист', description: 'Мягкий фиолетовый', light: false,
      background: '#120E1C', backgroundDeep: '#0B0813', panel: '#1B1528',
      panelElevated: '#241C34', panelSoft: '#2E2442', line: '#3B2F52',
      textPrimary: '#F7F2FF', textSecondary: '#A79ABF', textTertiary: '#7C6E94',
    },
    light: {
      label: 'Светлая', description: 'Дневная тема', light: true,
      background: '#F4F7FA', backgroundDeep: '#E9EFF5', panel: '#FFFFFF',
      panelElevated: '#F0F4F8', panelSoft: '#E2E9F0', line: '#D6DEE7',
      textPrimary: '#0F1A24', textSecondary: '#5E6E7E', textTertiary: '#8A98A6',
    },
  };
  const THEME_ORDER = ['telegram', 'midnight', 'graphite', 'ocean', 'forest', 'amethyst', 'light'];

  const ACCENTS = {
    blue: { label: 'Синий', hex: '#2AABEE' },
    green: { label: 'Зелёный', hex: '#43B581' },
    purple: { label: 'Фиолетовый', hex: '#9B7EDE' },
    orange: { label: 'Оранжевый', hex: '#E8A24A' },
    pink: { label: 'Розовый', hex: '#E06A9A' },
    red: { label: 'Красный', hex: '#E05A5A' },
    cyan: { label: 'Бирюзовый', hex: '#3ECFD0' },
  };
  const ACCENT_ORDER = ['blue', 'green', 'purple', 'orange', 'pink', 'red', 'cyan'];

  const FONT_SIZES = {
    small: { label: 'Мелкий', scale: 0.9 },
    normal: { label: 'Обычный', scale: 1 },
    large: { label: 'Крупный', scale: 1.1 },
    xl: { label: 'Очень крупный', scale: 1.2 },
  };
  const BUBBLES = { rounded: 'Круглые', soft: 'Мягкие', compact: 'Компактные' };
  const DENSITIES = { compact: 'Компактно', comfortable: 'Свободно' };
  const WALLPAPERS = [
    { id: 'default', label: 'Стандартные' },
    { id: 'night', label: 'Ночные' },
    { id: 'ocean', label: 'Океан' },
    { id: 'forest', label: 'Лес' },
    { id: 'sand', label: 'Песок' },
    { id: 'plain', label: 'Без обоев' },
  ];

  const AVATARS = [
    { id: 'initials', emoji: '', color: '#5B9CFF' },
    { id: 'fox', emoji: '🦊', color: '#F09A5B' },
    { id: 'panda', emoji: '🐼', color: '#9AA7B4' },
    { id: 'frog', emoji: '🐸', color: '#62C98B' },
    { id: 'octopus', emoji: '🐙', color: '#B58CFF' },
    { id: 'owl', emoji: '🦉', color: '#7C9BFF' },
    { id: 'tiger', emoji: '🐯', color: '#F2B24C' },
    { id: 'koala', emoji: '🐨', color: '#8FA9C4' },
    { id: 'wolf', emoji: '🐺', color: '#7F92A8' },
    { id: 'unicorn', emoji: '🦄', color: '#F28BC2' },
    { id: 'monkey', emoji: '🐵', color: '#D89B6A' },
    { id: 'cat', emoji: '🐱', color: '#F0C45A' },
  ];

  function defaultSettings() {
    return {
      theme: 'telegram',
      accent: 'blue',
      wallpaper: 'default',
      fontSize: 'normal',
      bubbleStyle: 'rounded',
      density: 'comfortable',
      wallpaperDim: 0.18,
      showTimestamps: true,
      haptics: true,
      autoScan: true,
      autoReconnect: true,
      animations: true,
      keepScreenOn: false,
      showLinkBanners: true,
      serverUrl: DEFAULT_SERVER,
      serverToken: '',
    };
  }

  const state = {
    settings: defaultSettings(),
    me: null,
    token: '',
    deviceId: '',
    screen: 'empty',
    activePeerId: null,
    threads: new Map(),
    roster: new Map(),
    messages: new Map(),
    drafts: new Map(),
    ws: null,
    wsGen: 0,
    connected: false,
    connecting: false,
    lastConnectionError: '',
    attempts: 0,
    repairTried: false,
    reconnectTimer: null,
    pingTimer: null,
    typingPeerId: null,
    typingTimer: null,
    typingSentAt: 0,
    onboardingStep: 0,
    signup: { nickname: '', avatarId: 'initials', photo: null, creator: false, mode: 'emoji' },
    signupError: '',
    settingsReturn: 'empty',
    settingsFromOnboarding: false,
    profileReturn: 'empty',
    profileDraft: null,
    profileError: '',
    serverDraft: { url: '', token: '' },
    serverSaved: false,
    search: { query: '', users: [], loading: false, error: '', controller: null, timer: null, open: false },
    bannerDismissed: false,
    tap: { count: 0, at: 0, context: '' },
    adminTap: { count: 0, at: 0 },
    onlineCount: 0,
    notice: null,
    noticeDismissed: '',
    readTimers: new Map(),
    admin: { token: '', state: null, loading: false, error: '', timer: null, busy: false },
    photoContext: null,
    wakeLock: null,
    toastTimer: null,
    booted: false,
  };

  // ------------------------------------------------------------------
  // Small helpers
  // ------------------------------------------------------------------

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function icon(name) {
    return `<svg class="i" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseHex(hex) {
    const clean = String(hex || '').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const num = Number.parseInt(full, 16);
    if (!Number.isFinite(num)) return { r: 0, g: 0, b: 0 };
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function mix(colorA, colorB, amount) {
    const a = parseHex(colorA);
    const b = parseHex(colorB);
    const t = clamp(amount, 0, 1);
    const toHex = (v) => Math.round(v).toString(16).padStart(2, '0');
    return `#${toHex(a.r + (b.r - a.r) * t)}${toHex(a.g + (b.g - a.g) * t)}${toHex(a.b + (b.b - a.b) * t)}`.toUpperCase();
  }

  function rgba(hex, alpha) {
    const c = parseHex(hex);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${clamp(alpha, 0, 1)})`;
  }

  function luminance(hex) {
    const c = parseHex(hex);
    const convert = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * convert(c.r) + 0.7152 * convert(c.g) + 0.0722 * convert(c.b);
  }

  function normalizeNickname(raw) {
    return String(raw || '')
      .replace(/\[Создатель\]/gi, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, MAX_NICKNAME);
  }

  function displayName(nickname, creator) {
    const clean = normalizeNickname(nickname);
    return creator ? `${CREATOR_PREFIX} ${clean}` : clean;
  }

  function cleanDisplayName(name) {
    return String(name || '').replace(/^\s*\[Создатель\]\s*/i, '').trim();
  }

  function initials(name) {
    const clean = cleanDisplayName(name);
    if (!clean) return 'UC';
    return clean
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => Array.from(word)[0] || '')
      .join('')
      .toUpperCase() || 'UC';
  }

  function normalizeAvatar(id) {
    return AVATARS.some((avatar) => avatar.id === id) ? id : 'initials';
  }

  function avatarPreset(id) {
    return AVATARS.find((avatar) => avatar.id === id) || AVATARS[0];
  }

  function avatarHtml(options = {}) {
    const size = Number(options.size) || 48;
    const preset = avatarPreset(options.avatarId);
    const creator = !!options.creator;
    const photo = typeof options.photo === 'string' && options.photo ? options.photo : '';
    const name = options.name || '';
    const online = !!options.online;
    let content;
    if (photo) {
      content = `<img src="${escapeAttr(photo)}" alt="${escapeAttr(cleanDisplayName(name))}">`;
    } else if (preset.emoji) {
      content = `<span class="avatar-emoji">${escapeHtml(preset.emoji)}</span>`;
    } else {
      content = `<span class="avatar-initials">${escapeHtml(initials(name))}</span>`;
    }
    const border = creator ? 'var(--gold)' : rgba(preset.color, 0.45);
    const bg = `linear-gradient(135deg, ${rgba(preset.color, 0.34)}, var(--panel-elevated))`;
    return `<span class="avatar${creator ? ' gold' : ''}" style="--s:${size}px" aria-hidden="true">` +
      `<span class="avatar-disc" style="background:${bg};border-color:${border}">${content}</span>` +
      (creator ? `<span class="avatar-crown">${icon('crown')}</span>` : '') +
      (online ? '<span class="presence"></span>' : '') +
      '</span>';
  }

  function haptic() {
    if (!state.settings.haptics || !navigator.vibrate) return;
    try {
      navigator.vibrate(8);
    } catch {
      /* ignore */
    }
  }

  function toast(message, options = {}) {
    const node = $('toast');
    if (!node) return;
    clearTimeout(state.toastTimer);
    node.textContent = message;
    node.classList.toggle('error', options.error === true);
    node.classList.add('show');
    state.toastTimer = setTimeout(() => node.classList.remove('show'), options.duration || 2800);
  }

  function showNotice(notice) {
    if (!notice || !notice.id) return;
    if (state.noticeDismissed === notice.id) return;
    state.notice = notice;
    renderNotice();
  }

  function renderNotice() {
    const banner = $('notice-banner');
    if (!banner) return;
    const notice = state.notice;
    if (!notice) {
      banner.classList.add('hidden');
      return;
    }
    const title = $('notice-title');
    const text = $('notice-text');
    const action = $('notice-action');
    if (title) title.textContent = notice.title || 'Обновление UltraChat';
    if (text) {
      const parts = [];
      if (notice.text) parts.push(notice.text);
      if (notice.version) parts.push(`Версия ${notice.version}`);
      text.textContent = parts.join(' · ');
    }
    if (action) {
      if (notice.url) {
        action.href = notice.url;
        action.classList.remove('hidden');
      } else {
        action.classList.add('hidden');
        action.removeAttribute('href');
      }
    }
    banner.classList.remove('hidden');
  }

  function dismissNotice() {
    if (state.notice) state.noticeDismissed = state.notice.id || '';
    const banner = $('notice-banner');
    if (banner) banner.classList.add('hidden');
  }

  function formatTime(ts) {
    const date = new Date(Number(ts) || Date.now());
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function formatThreadTime(ts) {
    const value = Number(ts);
    if (!value) return '';
    const date = new Date(value);
    const now = new Date();
    if (sameDay(date, now)) return formatTime(value);
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date);
  }

  function formatDateLabel(ts) {
    const date = new Date(Number(ts) || Date.now());
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (sameDay(date, now)) return 'Сегодня';
    if (sameDay(date, yesterday)) return 'Вчера';
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    }).format(date);
  }

  function normalizeServerUrl(raw) {
    let value = String(raw || '').trim();
    if (!value) return '';
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
    value = value.replace(/\/+$/, '');
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return value;
    } catch {
      return null;
    }
  }

  function serverHost(url) {
    try {
      return new URL(url).host;
    } catch {
      return 'не указан';
    }
  }

  function currentServer() {
    return normalizeServerUrl(state.settings.serverUrl) || '';
  }

  function mediaUrl(path) {
    if (!path) return '';
    const value = String(path);
    if (/^(data:|blob:|https?:)/i.test(value)) return value;
    const base = currentServer();
    return base ? `${base}${value.startsWith('/') ? '' : '/'}${value}` : value;
  }

  function debounceSearch(callback, delay) {
    clearTimeout(state.search.timer);
    state.search.timer = setTimeout(callback, delay);
  }

  // ------------------------------------------------------------------
  // Persistence
  // ------------------------------------------------------------------

  function ensureDeviceId() {
    let id = localStorage.getItem(STORAGE.device) || '';
    if (id.length >= 4) return id;
    try {
      id = `web-${crypto.randomUUID()}`;
    } catch {
      id = `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    }
    try {
      localStorage.setItem(STORAGE.device, id);
    } catch {
      /* ignore */
    }
    return id;
  }

  function loadSettings() {
    const saved = readJSON(STORAGE.settings, {});
    const base = defaultSettings();
    if (!saved || typeof saved !== 'object') return base;
    const result = { ...base, ...saved };
    if (!THEMES[result.theme]) result.theme = base.theme;
    if (!ACCENTS[result.accent]) result.accent = base.accent;
    if (!WALLPAPERS.some((item) => item.id === result.wallpaper)) result.wallpaper = base.wallpaper;
    if (!FONT_SIZES[result.fontSize]) result.fontSize = base.fontSize;
    if (!BUBBLES[result.bubbleStyle]) result.bubbleStyle = base.bubbleStyle;
    if (!DENSITIES[result.density]) result.density = base.density;
    result.wallpaperDim = clamp(Number(result.wallpaperDim) || 0, 0, 0.8);
    result.showTimestamps = result.showTimestamps !== false;
    result.haptics = result.haptics !== false;
    result.autoScan = result.autoScan !== false;
    result.autoReconnect = result.autoReconnect !== false;
    result.animations = result.animations !== false;
    result.keepScreenOn = result.keepScreenOn === true;
    result.showLinkBanners = result.showLinkBanners !== false;
    if (typeof result.serverUrl !== 'string') result.serverUrl = base.serverUrl;
    if (typeof result.serverToken !== 'string') result.serverToken = '';
    return result;
  }

  function saveSettings() {
    writeJSON(STORAGE.settings, state.settings);
  }

  function loadProfile() {
    const saved = readJSON(STORAGE.profile, null);
    if (!saved || typeof saved !== 'object') return null;
    const nickname = normalizeNickname(saved.nickname);
    if (!nickname) return null;
    return {
      id: typeof saved.id === 'string' ? saved.id : '',
      nickname,
      creator: saved.creator === true,
      avatarId: normalizeAvatar(saved.avatarId),
      photo: typeof saved.photo === 'string' ? saved.photo : null,
      displayName: typeof saved.displayName === 'string' && saved.displayName
        ? saved.displayName
        : displayName(nickname, saved.creator === true),
    };
  }

  function saveProfile() {
    if (!state.me) return;
    writeJSON(STORAGE.profile, state.me);
  }

  function loadStoredThreads() {
    const saved = readJSON(STORAGE.threads, []);
    if (!Array.isArray(saved)) return [];
    return saved.filter((thread) => thread && typeof thread.id === 'string' && thread.id.length > 0);
  }

  function saveThreads() {
    writeJSON(STORAGE.threads, Array.from(state.threads.values()));
  }

  function loadMessages(peerId) {
    if (state.messages.has(peerId)) return state.messages.get(peerId);
    const saved = readJSON(`${STORAGE.history}${peerId}`, []);
    const list = Array.isArray(saved)
      ? saved
        .filter((message) => message && typeof message.id === 'string' && Number.isFinite(Number(message.ts)))
        .map((message) => ({
          id: message.id,
          from: String(message.from || ''),
          to: message.to ? String(message.to) : null,
          sender: String(message.sender || ''),
          creator: message.creator === true,
          text: String(message.text || ''),
          kind: message.kind === 'image' ? 'image' : 'text',
          image: message.image ? String(message.image) : null,
          localImage: null,
          ts: Number(message.ts),
          readAt: Number(message.readAt) || 0,
          editedAt: Number(message.editedAt) || 0,
          mine: message.mine === true,
          pending: false,
          failed: false,
        }))
        .sort((a, b) => a.ts - b.ts)
      : [];
    state.messages.set(peerId, list);
    return list;
  }

  function saveMessages(peerId) {
    const list = state.messages.get(peerId) || [];
    const prepared = list
      .slice(-MAX_MESSAGES_PER_PEER)
      .map((message) => ({
        id: message.id,
        from: message.from,
        to: message.to,
        sender: message.sender,
        creator: !!message.creator,
        text: message.text || '',
        kind: message.kind === 'image' ? 'image' : 'text',
        image: message.image || null,
        ts: message.ts,
        readAt: Number(message.readAt) || 0,
        editedAt: Number(message.editedAt) || 0,
        mine: !!message.mine,
      }));
    writeJSON(`${STORAGE.history}${peerId}`, prepared);
  }

  function clearHistoryStorage() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE.history)) keys.push(key);
    }
    keys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
    try {
      localStorage.removeItem(STORAGE.threads);
    } catch {
      /* ignore */
    }
  }

  function clearAppStorage() {
    const keys = [STORAGE.device, STORAGE.token, STORAGE.profile, STORAGE.settings, STORAGE.threads];
    keys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
    clearHistoryStorage();
  }

  // ------------------------------------------------------------------
  // Theme application
  // ------------------------------------------------------------------

  function paletteFor(themeId, accentId) {
    const surface = THEMES[themeId] || THEMES.telegram;
    const accent = (ACCENTS[accentId] || ACCENTS.blue).hex;
    const onAccent = luminance(accent) > 0.4 ? '#07131B' : '#FFFFFF';
    const bubbleMine = surface.light ? accent : mix(surface.panelElevated, accent, 0.42);
    const bubbleOther = surface.light ? '#FFFFFF' : surface.panelElevated;
    const accentSoft = surface.light ? mix(accent, '#000000', 0.12) : mix(accent, '#FFFFFF', 0.22);
    return {
      ...surface,
      accent,
      accentSoft,
      onAccent,
      bubbleMine,
      bubbleOther,
      bubbleMineText: surface.light ? onAccent : '#FFFFFF',
      bubbleOtherText: surface.textPrimary,
      bubbleMineTime: surface.light ? rgba(onAccent, 0.62) : 'rgba(255,255,255,0.62)',
      bubbleOtherTime: surface.textTertiary,
      creatorGold: surface.light ? '#A9791C' : '#E8C56A',
      creatorAmber: surface.light ? '#B8860B' : '#E0A94A',
      danger: surface.light ? '#C23A4A' : '#E86A7A',
      success: surface.light ? '#2E8B57' : '#6BCB8F',
    };
  }

  function applySettings() {
    const p = paletteFor(state.settings.theme, state.settings.accent);
    const root = document.documentElement;
    const set = (name, value) => root.style.setProperty(name, value);
    set('--bg', p.background);
    set('--bg-deep', p.backgroundDeep);
    set('--panel', p.panel);
    set('--panel-elevated', p.panelElevated);
    set('--panel-soft', p.panelSoft);
    set('--line', p.line);
    set('--accent', p.accent);
    set('--accent-soft', p.accentSoft);
    set('--on-accent', p.onAccent);
    set('--bubble-mine', p.bubbleMine);
    set('--bubble-other', p.bubbleOther);
    set('--bubble-mine-text', p.bubbleMineText);
    set('--bubble-other-text', p.bubbleOtherText);
    set('--bubble-mine-time', p.bubbleMineTime);
    set('--bubble-other-time', p.bubbleOtherTime);
    set('--text', p.textPrimary);
    set('--text-secondary', p.textSecondary);
    set('--text-tertiary', p.textTertiary);
    set('--gold', p.creatorGold);
    set('--amber', p.creatorAmber);
    set('--danger', p.danger);
    set('--success', p.success);
    set('--accent-04', rgba(p.accent, 0.04));
    set('--accent-08', rgba(p.accent, 0.08));
    set('--accent-12', rgba(p.accent, 0.12));
    set('--accent-14', rgba(p.accent, 0.14));
    set('--accent-20', rgba(p.accent, 0.2));
    set('--accent-32', rgba(p.accent, 0.32));
    set('--line-65', rgba(p.line, 0.65));
    set('--panel-55', rgba(p.panel, 0.55));
    set('--panel-75', rgba(p.panel, 0.75));
    set('--gold-14', rgba(p.creatorGold, 0.14));
    set('--gold-40', rgba(p.creatorGold, 0.4));
    set('--danger-08', rgba(p.danger, 0.08));
    set('--danger-14', rgba(p.danger, 0.14));
    set('--danger-35', rgba(p.danger, 0.35));
    set('--success-soft', rgba(p.success, 0.14));
    set('--font-scale', String(FONT_SIZES[state.settings.fontSize].scale));
    set('--wall-dim', String(state.settings.wallpaperDim));
    document.body.dataset.bubble = state.settings.bubbleStyle;
    document.body.dataset.density = state.settings.density;
    document.body.classList.toggle('no-anim', !state.settings.animations);
    const meta = q('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', p.background);
    const wallpaper = $('chat-wallpaper');
    if (wallpaper) wallpaper.dataset.wallpaper = state.settings.wallpaper;
    updateWakeLock();
  }

  // ------------------------------------------------------------------
  // Onboarding
  // ------------------------------------------------------------------

  function renderOnboarding() {
    $('onboarding').classList.remove('hidden');
    $('shell').classList.add('hidden');
    const sidebar = q('.sidebar');
    if (sidebar) sidebar.style.display = '';
    renderStepDots();
    renderSignupStage();
    $('signup-error').textContent = state.signupError;
    $('signup-error').classList.toggle('hidden', !state.signupError);
    updateSignupNext();
  }

  function renderStepDots() {
    const root = $('step-dots');
    root.innerHTML = [0, 1, 2].map((index) =>
      `<span class="step-dot${index <= state.onboardingStep ? ' active' : ''}${index === state.onboardingStep ? ' current' : ''}"></span>`,
    ).join('');
  }

  function signupPraise(value) {
    const length = normalizeNickname(value).length;
    if (!length) return 'Придумай имя — его увидят рядом';
    if (length < 2) return 'Ещё пару символов';
    if (length < 6) return 'Неплохо! Можно и поярче';
    if (length < 12) return 'Отличный ник — тебя запомнят';
    return 'Мощно. Настоящий ник для ультра чата';
  }

  function renderSignupStage() {
    const stage = $('signup-stage');
    if (state.onboardingStep === 0) {
      stage.innerHTML = `<div class="signup-step welcome-step">
        <div class="hero-logo">💬</div>
        <h1 class="display-title">Добро пожаловать</h1>
        <p class="welcome-copy">UltraChat — мессенджер.
Из любой точки — через сервер. Без интернета — по Bluetooth.</p>
        <div class="feature-lines">
          <div class="feature-line"><span class="feature-tag">Сервер</span><span>чаты и фото из любой точки мира</span></div>
          <div class="feature-line"><span class="feature-tag">Bluetooth</span><span>запасной канал без интернета</span></div>
          <div class="feature-line"><span class="feature-tag">История</span><span>переписка хранится на устройстве</span></div>
        </div>
      </div>`;
      return;
    }
    if (state.onboardingStep === 1) {
      stage.innerHTML = `<div class="signup-step nickname-step">
        <h1 class="display-title">Введите никнейм</h1>
        <p class="signup-sub">Так тебя будут видеть другие устройства</p>
        <div class="field nickname-field">
          ${icon('user')}
          <input id="signup-nickname" type="text" maxlength="${MAX_NICKNAME}" autocomplete="nickname" autocapitalize="sentences" placeholder="Например, Скай" aria-label="Никнейм" value="${escapeAttr(state.signup.nickname)}">
        </div>
        <div class="praise${normalizeNickname(state.signup.nickname).length >= 2 ? ' good' : ''}" id="signup-praise">${escapeHtml(signupPraise(state.signup.nickname))}</div>
      </div>`;
      return;
    }
    const mode = state.signup.mode === 'photo' ? 'photo' : 'emoji';
    const preview = avatarHtml({
      name: state.signup.nickname || 'Ultra',
      avatarId: state.signup.avatarId,
      photo: state.signup.photo,
      creator: state.signup.creator,
      size: 104,
    });
    const role = state.signup.creator ? '<div class="profile-role creator" style="margin-top:6px">СОЗДАТЕЛЬ</div>' : '';
    let content;
    if (mode === 'emoji') {
      content = `<div class="avatar-grid">${AVATARS.map((avatar) =>
        `<button class="avatar-choice${state.signup.photo == null && avatar.id === state.signup.avatarId ? ' selected' : ''}" type="button" data-action="signup-avatar" data-id="${avatar.id}" aria-label="Аватар ${avatar.id}">` +
        (avatar.emoji ? `<span>${escapeHtml(avatar.emoji)}</span>` : icon('user')) +
        '</button>',
      ).join('')}</div>`;
    } else {
      content = `<div class="avatar-photo-panel">
        <div class="avatar-photo-note">${state.signup.photo ? 'Фото выбрано' : 'Выбери фото — обрежь по кругу'}</div>
        <button class="primary-btn" type="button" data-action="signup-photo-pick" style="height:46px">
          ${icon('wallpaper')}<span>${state.signup.photo ? 'Выбрать другое' : 'Загрузить фото'}</span>
        </button>
        ${state.signup.photo ? '<button class="link-btn" type="button" data-action="signup-photo-remove">Убрать фото</button>' : ''}
      </div>`;
    }
    stage.innerHTML = `<div class="signup-step avatar-step">
      <button class="avatar-hit avatar-preview" type="button" data-action="secret-tap" data-context="signup" aria-label="Аватар">${preview}</button>
      ${role}
      <h2 class="avatar-step-title">Выбери аватар</h2>
      <div class="mode-switch">
        <button class="mode-chip${mode === 'emoji' ? ' active' : ''}" type="button" data-action="signup-mode" data-mode="emoji">Эмодзи</button>
        <button class="mode-chip${mode === 'photo' ? ' active' : ''}" type="button" data-action="signup-mode" data-mode="photo">Фото</button>
      </div>
      ${content}
    </div>`;
  }

  function updateSignupNext() {
    const next = $('signup-next');
    const busy = state.signupBusy === true;
    const clean = normalizeNickname(state.signup.nickname);
    const disabled = busy || (state.onboardingStep === 1 && clean.length < 2) ||
      (state.onboardingStep === 2 && clean.length < 2);
    next.disabled = disabled;
    const labels = ['Продолжить', 'Продолжить', 'Начать общение'];
    const glyph = state.onboardingStep === 2 ? 'chat' : 'chevron';
    next.innerHTML = busy
      ? '<span class="spinner" style="border-color:rgba(255,255,255,.35);border-top-color:currentColor"></span><span>Подключаемся…</span>'
      : `${icon(glyph)}<span>${labels[state.onboardingStep]}</span>`;
  }

  function updateSignupPraise() {
    const input = $('signup-nickname');
    const praise = $('signup-praise');
    if (!input || !praise) return;
    state.signup.nickname = input.value.slice(0, MAX_NICKNAME);
    praise.textContent = signupPraise(input.value);
    praise.classList.toggle('good', normalizeNickname(input.value).length >= 2);
    state.signupError = '';
    $('signup-error').classList.add('hidden');
    updateSignupNext();
  }

  function selectSignupAvatar(id) {
    state.signup.avatarId = normalizeAvatar(id);
    state.signup.photo = null;
    state.signup.mode = 'emoji';
    haptic();
    renderOnboarding();
  }

  function setSignupMode(mode) {
    if (mode === 'emoji') {
      state.signup.mode = 'emoji';
      state.signup.photo = null;
    } else {
      state.signup.mode = 'photo';
    }
    haptic();
    renderOnboarding();
  }

  function advanceOnboarding() {
    if (state.signupBusy) return;
    if (state.onboardingStep === 0) {
      state.onboardingStep = 1;
      state.signupError = '';
      renderOnboarding();
      return;
    }
    if (state.onboardingStep === 1) {
      const clean = normalizeNickname(state.signup.nickname);
      if (clean.length < 2) {
        state.signupError = 'Никнейм минимум 2 символа';
        renderOnboarding();
        return;
      }
      state.signup.nickname = clean;
      state.onboardingStep = 2;
      state.signupError = '';
      renderOnboarding();
      return;
    }
    completeSignUp();
  }

  // ------------------------------------------------------------------
  // Shell, chat list and chat
  // ------------------------------------------------------------------

  function setScreen(screen) {
    state.screen = screen;
    const empty = $('empty-view');
    const chat = $('chat-view');
    const settings = $('settings-view');
    const profile = $('profile-view');
    if (!empty || !chat || !settings || !profile) return;
    empty.classList.toggle('hidden', screen !== 'empty');
    chat.classList.toggle('hidden', screen !== 'chat');
    settings.classList.toggle('hidden', screen !== 'settings');
    profile.classList.toggle('hidden', screen !== 'profile');
    const shell = $('shell');
    if (shell) {
      if (window.innerWidth < 900) {
        shell.classList.toggle('detail', screen !== 'empty');
      } else {
        shell.classList.remove('detail');
      }
    }
    updateWakeLock();
  }

  function showShell() {
    $('onboarding').classList.add('hidden');
    $('shell').classList.remove('hidden');
    const sidebar = q('.sidebar');
    if (sidebar) sidebar.style.display = '';
    ensureLobbyThread();
    renderMeButton();
    renderThreads();
    renderSidebarFoot();
    renderConnectionStatus();
  }

  function ensureLobbyThread() {
    const thread = ensureThread(LOBBY_ID);
    if (!thread) return null;
    thread.title = LOBBY_TITLE;
    thread.creator = false;
    thread.avatarId = 'initials';
    thread.online = true;
    return thread;
  }

  function isLobby(peerId) {
    return peerId === LOBBY_ID;
  }

  function renderMeButton() {
    const button = $('me-button');
    if (!button || !state.me) return;
    const name = state.me.displayName || displayName(state.me.nickname, state.me.creator);
    button.innerHTML = avatarHtml({
      name,
      avatarId: state.me.avatarId,
      photo: state.me.photo,
      creator: state.me.creator,
      size: 44,
    });
    button.title = name;
    button.setAttribute('aria-label', `Профиль: ${name}`);
  }

  function renderSidebarFoot() {
    const foot = $('sidebar-foot');
    if (!foot) return;
    const host = currentServer() ? serverHost(currentServer()) : 'не указан';
    foot.textContent = `Сервер: ${host} · история на устройстве`;
  }

  function ensureThread(peerId, patch = {}) {
    if (!peerId) return null;
    let thread = state.threads.get(peerId);
    if (!thread) {
      thread = {
        id: peerId,
        title: 'Собеседник',
        creator: false,
        avatarId: 'initials',
        lastText: '',
        lastTs: 0,
        lastIsMine: false,
        count: 0,
        online: false,
      };
      state.threads.set(peerId, thread);
    }
    Object.assign(thread, patch);
    if (!thread.title) thread.title = 'Собеседник';
    thread.avatarId = normalizeAvatar(thread.avatarId);
    return thread;
  }

  function threadView(thread) {
    if (thread.id === LOBBY_ID) {
      return {
        id: LOBBY_ID,
        title: LOBBY_TITLE,
        shortTitle: LOBBY_TITLE,
        creator: false,
        avatarId: 'initials',
        online: true,
        lobby: true,
        lastText: thread.lastText || '',
        lastTs: Number(thread.lastTs) || 0,
        lastIsMine: thread.lastIsMine === true,
        count: Number(thread.count) || 0,
      };
    }
    const peer = state.roster.get(thread.id);
    const creator = peer ? peer.creator === true : thread.creator === true;
    const rawTitle = peer && peer.displayName ? peer.displayName : thread.title;
    const title = cleanDisplayName(rawTitle) || 'Собеседник';
    return {
      id: thread.id,
      title: creator ? `${CREATOR_PREFIX} ${title}` : title,
      shortTitle: title,
      creator,
      avatarId: normalizeAvatar(peer && peer.avatar ? peer.avatar : thread.avatarId),
      online: peer ? peer.online === true : thread.online === true,
      lastText: thread.lastText || '',
      lastTs: Number(thread.lastTs) || 0,
      lastIsMine: thread.lastIsMine === true,
      count: Number(thread.count) || 0,
    };
  }

  function sortedThreads() {
    const list = Array.from(state.threads.values())
      .filter((thread) => thread && thread.id && (!state.me || thread.id !== state.me.id))
      .map(threadView)
      .sort((a, b) => {
        if (b.lastTs !== a.lastTs) return b.lastTs - a.lastTs;
        return a.title.localeCompare(b.title, 'ru');
      });
    const lobby = list.find((thread) => thread.id === LOBBY_ID);
    const personal = list.filter((thread) => thread.id !== LOBBY_ID);
    return { lobby: lobby || null, personal };
  }

  function threadMarkup(thread) {
    const preview = thread.lobby
      ? (thread.lastText ? (thread.lastIsMine ? `Вы: ${thread.lastText}` : thread.lastText) : 'Общайтесь со всеми участниками')
      : (thread.lastText ? `${thread.lastIsMine ? 'Вы: ' : ''}${thread.lastText}` : 'Начните переписку');
    const time = thread.lobby
      ? (thread.lastTs ? formatThreadTime(thread.lastTs) : 'общий')
      : formatThreadTime(thread.lastTs);
    return `<button class="thread${thread.lobby ? ' lobby-thread' : ''}${state.activePeerId === thread.id ? ' active' : ''}${thread.creator ? ' creator' : ''}" type="button" data-peer="${escapeAttr(thread.id)}">
      ${avatarHtml({ name: thread.title, avatarId: thread.avatarId, creator: thread.creator, online: thread.lobby ? false : thread.online, size: 48 })}
      <span class="thread-copy">
        <span class="thread-title">${escapeHtml(thread.title)}</span>
        <span class="thread-preview">${escapeHtml(preview)}</span>
      </span>
      <span class="thread-side">
        <span class="thread-time">${escapeHtml(time)}</span>
        ${thread.lobby ? '<span class="thread-count">все</span>' : thread.count > 1 ? `<span class="thread-count">${thread.count}</span>` : ''}
      </span>
    </button>`;
  }

  function renderThreads() {
    const root = $('threads');
    if (!root) return;
    ensureLobbyThread();
    const { lobby, personal } = sortedThreads();
    const head = q('.threads-head');
    if (head) head.classList.remove('hidden');
    const count = $('threads-count');
    if (count) count.textContent = personal.length ? String(personal.length) : '';
    const html = [lobby ? threadMarkup(lobby) : ''];
    if (!personal.length) {
      html.push(`<div class="empty-threads inline">
        <p>Пока нет личных чатов. Общий чат уже доступен — начните с него.</p>
        <button class="primary-btn compact-btn" type="button" data-action="open-add">${icon('plus')}<span>Добавить собеседника</span></button>
      </div>`);
    } else {
      html.push(personal.map(threadMarkup).join(''));
    }
    root.innerHTML = html.join('');
  }

  function peerInfo(peerId) {
    if (peerId === LOBBY_ID) {
      return {
        id: LOBBY_ID,
        title: LOBBY_TITLE,
        shortTitle: LOBBY_TITLE,
        creator: false,
        avatarId: 'initials',
        online: true,
        lobby: true,
        photo: null,
      };
    }
    const thread = state.threads.get(peerId);
    const peer = state.roster.get(peerId);
    const creator = peer ? peer.creator === true : !!(thread && thread.creator);
    const rawTitle = peer && peer.displayName ? peer.displayName : (thread ? thread.title : 'Собеседник');
    const title = cleanDisplayName(rawTitle) || 'Собеседник';
    return {
      id: peerId,
      title: creator ? `${CREATOR_PREFIX} ${title}` : title,
      shortTitle: title,
      creator,
      avatarId: normalizeAvatar(peer && peer.avatar ? peer.avatar : (thread ? thread.avatarId : 'initials')),
      online: peer ? peer.online === true : !!(thread && thread.online),
      lobby: false,
      photo: null,
    };
  }

  function openChat(peerId) {
    if (!peerId) return;
    ensureThread(peerId);
    state.activePeerId = peerId;
    state.bannerDismissed = false;
    clearTypingIndicator();
    loadMessages(peerId);
    const thread = state.threads.get(peerId);
    if (thread && state.messages.has(peerId)) {
      thread.count = state.messages.get(peerId).length;
      saveThreads();
    }
    setScreen('chat');
    renderChatHeader();
    renderMessages({ forceScroll: true });
    const input = $('message-input');
    if (input) {
      input.value = state.drafts.get(peerId) || '';
      autoGrowInput();
      updateSendState();
    }
    renderThreads();
    if (state.connected) requestHistory(peerId);
    markChatRead(peerId);
    updateWakeLock();
  }

  function closeChat() {
    state.activePeerId = null;
    clearTypingIndicator();
    setScreen('empty');
    renderThreads();
    updateWakeLock();
  }

  function renderChatHeader() {
    const peerId = state.activePeerId;
    if (!peerId) return;
    const info = peerInfo(peerId);
    const avatar = $('chat-avatar');
    if (avatar) {
      avatar.innerHTML = avatarHtml({
        name: info.title,
        avatarId: info.avatarId,
        creator: info.creator,
        online: info.online,
        size: 40,
      });
    }
    const title = $('chat-title');
    if (title) {
      title.textContent = info.title;
      title.classList.toggle('creator', info.creator);
    }
    const deleteButton = $('chat-delete');
    if (deleteButton) deleteButton.classList.toggle('hidden', info.lobby === true);
    const status = $('chat-status');
    const statusText = $('chat-status-text');
    if (status && statusText) {
      status.classList.remove('online', 'typing', 'error');
      const typing = state.typingPeerId === peerId;
      if (typing) {
        status.classList.add('typing');
        statusText.textContent = 'печатает…';
      } else if (!currentServer()) {
        status.classList.add('error');
        statusText.textContent = 'Сервер не настроен';
      } else if (info.lobby) {
        if (state.connected) {
          status.classList.add('online');
          statusText.textContent = state.onlineCount > 0
            ? `Общий чат · ${state.onlineCount} онлайн`
            : 'Общий чат';
        } else if (state.connecting) {
          statusText.textContent = 'Общий чат · подключение…';
        } else {
          status.classList.add('error');
          statusText.textContent = 'Общий чат · нет связи';
        }
      } else if (state.connected) {
        status.classList.add('online');
        statusText.textContent = 'Сервер · подключено';
      } else if (state.connecting) {
        statusText.textContent = 'Сервер · переподключение…';
      } else if (state.lastConnectionError) {
        status.classList.add('error');
        statusText.textContent = 'Сервер · нет связи';
      } else {
        statusText.textContent = 'Сервер';
      }
    }
    const banner = $('chat-banner');
    const bannerText = $('chat-banner-text');
    if (banner && bannerText) {
      const show = state.settings.showLinkBanners && !state.bannerDismissed && !state.connected;
      if (show) {
        banner.classList.remove('hidden');
        bannerText.textContent = !currentServer()
          ? 'Укажите адрес сервера в настройках — без него чаты не работают.'
          : 'Сервер переподключается. Сообщения отправятся, когда связь вернётся.';
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  function renderMessages(options = {}) {
    const root = $('messages');
    const peerId = state.activePeerId;
    if (!root || !peerId) return;
    const messagesEl = root;
    const nearBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 140;
    const list = loadMessages(peerId).slice().sort((a, b) => a.ts - b.ts);
    const info = peerInfo(peerId);
    const lobby = isLobby(peerId);
    if (!list.length) {
      const heading = !currentServer()
        ? 'Сервер не настроен'
        : lobby
          ? LOBBY_TITLE
          : state.connected ? 'Начните общение' : 'Устанавливаем связь';
      const copy = !currentServer()
        ? 'Укажите адрес сервера в настройках — без него чаты не работают.'
        : lobby
          ? 'Общий чат видят все участники UltraChat. Будьте вежливы — сообщения сохраняются на сервере.'
          : state.connected
            ? 'Сообщения и фото идут через сервер. Собеседник может быть где угодно.'
            : 'Подключаемся к серверу. История на устройстве уже доступна.';
      messagesEl.innerHTML = `<div class="messages-empty">
        ${avatarHtml({ name: info.title, avatarId: info.avatarId, creator: info.creator, size: 76 })}
        <h2>${escapeHtml(heading)}</h2>
        <p>${escapeHtml(copy)}</p>
      </div>`;
      return;
    }
    let lastDay = '';
    let lastSender = null;
    const html = [];
    for (const message of list) {
      const day = formatDateLabel(message.ts);
      if (day !== lastDay) {
        lastDay = day;
        html.push(`<div class="date-sep"><span>${escapeHtml(day)}</span></div>`);
        lastSender = null;
      }
      const mine = message.mine === true;
      const showSender = lobby && !mine && message.sender !== lastSender;
      lastSender = mine ? '__me__' : message.sender;
      const imageUrl = message.image ? mediaUrl(message.image) : message.localImage || '';
      let body = '';
      if (showSender) {
        const senderName = displayName(cleanDisplayName(message.sender) || 'Участник', message.creator);
        body += `<div class="bubble-sender${message.creator ? ' creator' : ''}">${escapeHtml(senderName)}</div>`;
      }
      if (message.kind === 'image') {
        body = imageUrl
          ? `<img class="chat-photo" src="${escapeAttr(imageUrl)}" alt="Фото" loading="lazy">`
          : `<span class="photo-placeholder">${icon('image')}</span>`;
        if (showSender) {
          const senderName = displayName(cleanDisplayName(message.sender) || 'Участник', message.creator);
          body = `<div class="bubble-sender${message.creator ? ' creator' : ''}">${escapeHtml(senderName)}</div>${body}`;
        }
      }
      if (message.text) body += `<div class="bubble-text">${escapeHtml(message.text)}</div>`;
      let meta = '';
      if (message.creator) meta += `<span class="bubble-crown">${icon('crown')}</span>`;
      if (message.editedAt) meta += '<span class="bubble-edited">изм.</span>';
      if (message.failed) {
        meta += '<span class="bubble-time bubble-failed">Не отправлено</span>';
      } else {
        if (state.settings.showTimestamps) {
          meta += `<span class="bubble-time">${escapeHtml(formatTime(message.ts))}</span>`;
        }
        if (mine && !lobby) {
          if (message.pending) {
            meta += `<span class="bubble-ticks pending">${icon('clock')}</span>`;
          } else if (message.readAt) {
            meta += `<span class="bubble-ticks read" title="Прочитано">${icon('checks')}</span>`;
          } else {
            meta += `<span class="bubble-ticks" title="Отправлено">${icon('check')}</span>`;
          }
        }
      }
      const bubbleClass = `bubble${lobby ? ' lobby-bubble' : ''}${message.kind === 'image' ? ' has-photo' : ''}${message.editedAt ? ' edited' : ''}`;
      const menu = mine
        ? `<button class="bubble-more" type="button" data-action="message-menu" data-id="${escapeAttr(message.id)}" aria-label="Действия с сообщением" title="Действия">${icon('more')}</button>`
        : '';
      html.push(`<div class="msg-row${mine ? ' mine' : ''}${message.pending ? ' pending' : ''}${lobby ? ' lobby' : ''}" data-id="${escapeAttr(message.id)}">
        <div class="${bubbleClass}">${body}${meta || menu ? `<div class="bubble-meta">${meta}${menu}</div>` : ''}</div>
      </div>`);
    }
    messagesEl.innerHTML = html.join('');
    if (options.forceScroll || nearBottom) {
      requestAnimationFrame(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    }
  }

  function messagePreview(message) {
    if (!message) return '';
    if (message.kind === 'image') return message.text ? 'Фото' : 'Фото';
    return message.text || '';
  }

  function autoGrowInput() {
    const input = $('message-input');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(132, Math.max(44, input.scrollHeight))}px`;
  }

  function updateSendState() {
    const input = $('message-input');
    const send = $('send-btn');
    if (!input || !send) return;
    const text = input.value.trim();
    const ready = !!text && state.connected && !!state.activePeerId;
    send.classList.toggle('ready', ready);
    send.disabled = !ready;
  }

  function renderConnectionStatus() {
    const line = q('.conn-line');
    const dot = $('conn-dot');
    const text = $('conn-text');
    const warning = $('server-warning');
    const banner = $('server-banner');
    const bannerText = $('server-banner-text');
    if (!dot || !text) return;
    dot.classList.remove('pulsing', 'tone-muted', 'tone-success', 'tone-danger', 'tone-accent');
    if (line) line.classList.remove('online', 'error');
    if (!currentServer()) {
      dot.classList.add('tone-muted');
      text.textContent = 'Сервер не настроен';
      if (line) line.classList.add('error');
      if (warning) warning.classList.remove('hidden');
      if (banner) banner.classList.add('hidden');
    } else if (state.connected) {
      dot.classList.add('tone-success');
      text.textContent = 'Сервер · на связи';
      if (line) line.classList.add('online');
      if (warning) warning.classList.add('hidden');
      if (banner) banner.classList.add('hidden');
    } else if (state.connecting) {
      dot.classList.add('tone-accent', 'pulsing');
      text.textContent = 'Подключение к серверу…';
      if (warning) warning.classList.add('hidden');
      if (banner) {
        banner.classList.toggle('hidden', state.attempts === 0);
        if (bannerText) bannerText.textContent = state.attempts === 0 ? 'Подключение к серверу…' : 'Переподключение к серверу…';
      }
    } else if (state.lastConnectionError) {
      dot.classList.add('tone-danger');
      text.textContent = 'Сервер · нет связи';
      if (line) line.classList.add('error');
      if (warning) warning.classList.add('hidden');
      if (banner) banner.classList.add('hidden');
    } else {
      dot.classList.add('tone-muted');
      text.textContent = 'Ожидание подключения';
      if (warning) warning.classList.add('hidden');
      if (banner) banner.classList.add('hidden');
    }
    if (state.screen === 'chat' && state.activePeerId) renderChatHeader();
    if (state.screen === 'settings') updateServerWidgets();
  }

  // ------------------------------------------------------------------
  // Settings
  // ------------------------------------------------------------------

  function apkUrl() {
    const base = currentServer() || DEFAULT_SERVER;
    return `${base}/download/UltraChat.apk`;
  }

  function settingsSection(iconName, title, subtitle, body) {
    return `<section class="settings-section">
      <div class="section-head">
        <span class="section-icon">${icon(iconName)}</span>
        <div class="section-head-copy"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div>
      </div>
      <div class="section-body">${body}</div>
    </section>`;
  }

  function switchRow(iconName, title, subtitle, checked, key) {
    return `<button class="switch-row" type="button" role="switch" aria-checked="${checked ? 'true' : 'false'}" data-action="toggle" data-key="${key}">
      <span class="switch-glyph">${icon(iconName)}</span>
      <span class="switch-copy"><span class="switch-title">${escapeHtml(title)}</span><span class="switch-sub">${escapeHtml(subtitle)}</span></span>
      <span class="toggle"></span>
    </button>`;
  }

  function actionRow(iconName, title, subtitle, action, tone) {
    const style = tone ? ` style="--action-color:var(--${tone});--action-color-14:var(--${tone}-14)"` : '';
    return `<button class="action-row" type="button" data-action="${action}"${style}>
      <span class="action-glyph">${icon(iconName)}</span>
      <span class="action-copy"><span class="action-title">${escapeHtml(title)}</span><span class="action-sub">${escapeHtml(subtitle)}</span></span>
      ${icon('chevron')}
    </button>`;
  }

  function serverStateInfo() {
    if (!currentServer()) {
      return { text: 'Сервер не настроен', dot: 'tone-muted', pulsing: false };
    }
    if (state.connected) return { text: 'Сервер на связи', dot: 'tone-success', pulsing: false };
    if (state.connecting) return { text: 'Подключение к серверу…', dot: 'tone-accent', pulsing: true };
    if (state.lastConnectionError) return { text: 'Нет связи с сервером', dot: 'tone-danger', pulsing: false };
    return { text: 'Ожидание подключения', dot: 'tone-muted', pulsing: false };
  }

  function renderSettingsPreview() {
    const settings = state.settings;
    return `<div class="settings-preview">
      <div class="wallpaper" data-wallpaper="${escapeAttr(settings.wallpaper)}"></div>
      <div class="preview-inner">
        <div class="preview-head">
          ${avatarHtml({ name: 'Нова', avatarId: 'initials', size: 30 })}
          <div>
            <div class="preview-name">Нова</div>
            <div class="preview-status">Bluetooth · в сети</div>
          </div>
        </div>
        <div class="preview-messages">
          <div class="preview-row mine"><div class="preview-bubble">Привет! Как тебе оформление?${settings.showTimestamps ? '<span class="preview-time">12:30</span>' : ''}</div></div>
          <div class="preview-row"><div class="preview-bubble">Отлично, всё видно${settings.showTimestamps ? '<span class="preview-time">12:31</span>' : ''}</div></div>
        </div>
        <div class="preview-composer">
          <div class="preview-input">Сообщение</div>
          <div class="preview-send">${icon('send')}</div>
        </div>
      </div>
    </div>`;
  }

  function renderThemePicker() {
    return `<div class="theme-grid">${THEME_ORDER.map((themeId) => {
      const theme = THEMES[themeId];
      const p = paletteFor(themeId, state.settings.accent);
      const selected = state.settings.theme === themeId;
      return `<button class="theme-card${selected ? ' selected' : ''}" type="button" data-action="theme" data-value="${themeId}" style="--tc-panel:${p.panel};--tc-line:${p.line};--tc-text:${p.textPrimary};--tc-secondary:${p.textSecondary};--tc-accent:${p.accent}">
        <span class="theme-swatches">
          <span class="theme-swatch" style="background:${p.accent}"></span>
          <span class="theme-swatch" style="background:${p.background}"></span>
          <span class="theme-swatch" style="background:${p.panelElevated}"></span>
          ${selected ? `<span class="selected-mark">${icon('check')}</span>` : ''}
        </span>
        <div class="theme-name">${escapeHtml(theme.label)}</div>
        <div class="theme-desc">${escapeHtml(theme.description)}</div>
      </button>`;
    }).join('')}</div>`;
  }

  function renderAccentPicker() {
    return `<div class="accent-row">${ACCENT_ORDER.map((accentId) => {
      const accent = ACCENTS[accentId];
      const active = state.settings.accent === accentId;
      const checkColor = luminance(accent.hex) > 0.4 ? '#07131B' : '#FFFFFF';
      return `<button class="accent-dot${active ? ' active' : ''}" type="button" data-action="accent" data-value="${accentId}" style="--accent-dot:${accent.hex};color:${checkColor}" aria-label="${escapeAttr(accent.label)}" title="${escapeAttr(accent.label)}">${active ? icon('check') : ''}</button>`;
    }).join('')}</div>`;
  }

  function renderWallpaperPicker() {
    return `<div class="wallpaper-grid">${WALLPAPERS.map((wallpaper) => {
      const selected = state.settings.wallpaper === wallpaper.id;
      return `<button class="wallpaper-card${selected ? ' selected' : ''}" type="button" data-action="wallpaper" data-value="${wallpaper.id}">
        <span class="wallpaper-preview">
          <span class="wallpaper" data-wallpaper="${wallpaper.id}"></span>
          ${selected ? `<span class="wallpaper-check">${icon('check')}</span>` : ''}
        </span>
        <span class="wallpaper-name">${escapeHtml(wallpaper.label)}</span>
      </button>`;
    }).join('')}</div>`;
  }

  function renderSegments(options, selected) {
    return `<div class="segmented">${options.map(([value, label]) =>
      `<button class="seg${selected === value ? ' active' : ''}" type="button" data-action="${options.action || ''}" data-value="${value}">${escapeHtml(label)}</button>`,
    ).join('')}</div>`;
  }

  function renderSettings() {
    const root = $('settings-view');
    if (!root) return;
    const oldScroll = root.scrollTop;
    const settings = state.settings;
    const status = serverStateInfo();
    const fontOptions = Object.entries(FONT_SIZES).map(([value, item]) => [value, item.label]);
    const bubbleOptions = Object.entries(BUBBLES);
    const densityOptions = Object.entries(DENSITIES);

    const appearance = `<div class="settings-label">Тема</div>${renderThemePicker()}
      <div class="settings-label">Акцент</div>${renderAccentPicker()}`;

    const wallpaper = `${renderWallpaperPicker()}
      <div class="dim-line"><span>Затемнение</span><span id="dim-value">${Math.round(settings.wallpaperDim * 100)}%</span></div>
      <input type="range" min="0" max="80" step="1" value="${Math.round(settings.wallpaperDim * 100)}" data-action="dim" aria-label="Затемнение обоев">`;

    const chat = `<div class="settings-label">Размер текста</div>
      <div class="segmented" data-group="font">${fontOptions.map(([value, label]) =>
        `<button class="seg${settings.fontSize === value ? ' active' : ''}" type="button" data-action="font" data-value="${value}">${escapeHtml(label)}</button>`,
      ).join('')}</div>
      <div class="settings-label">Форма пузырей</div>
      <div class="segmented" data-group="bubble">${bubbleOptions.map(([value, label]) =>
        `<button class="seg${settings.bubbleStyle === value ? ' active' : ''}" type="button" data-action="bubble" data-value="${value}">${escapeHtml(label)}</button>`,
      ).join('')}</div>
      <div class="settings-label">Плотность списка</div>
      <div class="segmented" data-group="density">${densityOptions.map(([value, label]) =>
        `<button class="seg${settings.density === value ? ' active' : ''}" type="button" data-action="density" data-value="${value}">${escapeHtml(label)}</button>`,
      ).join('')}</div>
      <div style="margin-top:4px">
        ${switchRow('clock', 'Время сообщений', 'Показывать часы рядом с текстом', settings.showTimestamps, 'showTimestamps')}
        ${switchRow('vibrate', 'Вибрация', 'Отклик при отправке и выборе', settings.haptics, 'haptics')}
        ${switchRow('sun', 'Не гасить экран', 'Держать дисплей включённым в чате', settings.keepScreenOn, 'keepScreenOn')}
        ${switchRow('info', 'Плашки состояния', 'Подсказки о связи и отправке', settings.showLinkBanners, 'showLinkBanners')}
      </div>`;

    const bluetooth = `<div class="bt-status">
        <span class="status-dot tone-muted"></span>
        <div class="bt-copy">
          <div class="bt-title">Bluetooth доступен в Android-приложении</div>
          <div class="bt-sub">Основной канал — сервер. Bluetooth нужен только без интернета.</div>
        </div>
      </div>
      <div class="bt-note"><b>В веб-версии Bluetooth недоступен.</b> Браузер не умеет искать устройства рядом, поэтому запасной канал остаётся в APK для Android.</div>
      <div class="bt-actions">
        <a class="mini-btn" href="${escapeAttr(apkUrl())}" target="_blank" rel="noopener" style="text-decoration:none">${icon('download')}Скачать APK для Android</a>
      </div>`;

    const behavior = `
      ${switchRow('search', 'Автопоиск Bluetooth', 'Начинать поиск при открытии настроек Bluetooth', settings.autoScan, 'autoScan')}
      ${switchRow('refresh', 'Автопереподключение', 'Восстанавливать связь с сервером', settings.autoReconnect, 'autoReconnect')}
      ${switchRow('bolt', 'Анимации', 'Плавные переходы между экранами', settings.animations, 'animations')}`;

    const server = `<div class="server-status">
        <span class="status-dot ${status.dot}${status.pulsing ? ' pulsing' : ''}" id="server-status-dot"></span>
        <span id="server-status-text">${escapeHtml(status.text)}</span>
      </div>
      <p class="server-explainer">В сборку уже вшит сервер-релей, поэтому всё работает сразу после запуска. Адрес ниже нужен только если вы поднимаете сервер на другом ПК. Сообщения и фото идут через интернет, собеседники появляются в списке автоматически.</p>
      <div class="server-fields">
        <div>
          <span class="field-label">Адрес сервера</span>
          <label class="field">${icon('server')}<input id="server-url-input" type="url" inputmode="url" maxlength="300" autocomplete="url" placeholder="${escapeAttr(DEFAULT_SERVER)}" value="${escapeAttr(state.serverDraft.url)}"></label>
          <div class="field-help hidden" id="server-url-hint"></div>
        </div>
        <div>
          <span class="field-label">Токен доступа</span>
          <label class="field">${icon('lock')}<input id="server-token-input" type="password" maxlength="300" autocomplete="off" placeholder="Секретный токен" value="${escapeAttr(state.serverDraft.token)}"></label>
        </div>
        <button class="primary-btn" type="button" data-action="save-server" style="height:46px">${icon('check')}<span>${state.serverSaved ? 'Сохранено' : 'Сохранить'}</span></button>
        <div class="saved-note${state.serverSaved ? ' ok' : ''}" id="server-saved-note">${state.serverSaved ? 'Параметры сохранены локально' : 'Токен хранится только на этом устройстве'}</div>
      </div>`;

    const data = `
      ${actionRow('refresh', 'Сбросить настройки', 'Вернуть стандартную тему и поведение', 'reset-settings', 'gold')}
      <div class="row-divider"></div>
      ${actionRow('trash', 'Очистить историю', 'Удалить все сообщения на устройстве', 'clear-history', 'danger')}
      <div class="row-divider"></div>
      ${actionRow('user', 'Удалить аккаунт', 'Профиль, история и настройки — заново', 'delete-account', 'danger')}`;

    const about = `<div class="about-text">Серверный мессенджер: сообщения и фото идут через сервер из любой точки мира. Bluetooth остаётся запасным каналом, когда интернета нет.</div>
      <div class="about-line">${icon('shield')}<span>Сервер · фото · история на устройстве</span></div>
      <div class="about-actions">
        <a class="mini-btn" href="${escapeAttr(apkUrl())}" target="_blank" rel="noopener" style="text-decoration:none">${icon('download')}Скачать UltraChat для Android</a>
        <button class="mini-btn" type="button" data-action="check-server">${icon('server')}Проверить связь с сервером</button>
      </div>`;

    root.innerHTML = `<header class="settings-head">
        <button class="icon-btn" type="button" data-action="settings-close" aria-label="Назад">${icon('back')}</button>
        <div class="head-copy"><h1>Настройки</h1><p>Оформление, чат и поведение</p></div>
        <button class="icon-btn" type="button" data-action="reset-settings" aria-label="Сбросить настройки" title="Сбросить настройки">${icon('refresh')}</button>
      </header>
      <div class="settings-scroll">
        ${renderSettingsPreview()}
        ${settingsSection('palette', 'Оформление', 'Тема и акцентный цвет', appearance)}
        ${settingsSection('wallpaper', 'Обои чата', 'Фон переписки и затемнение', wallpaper)}
        ${settingsSection('chat', 'Чат', 'Текст, пузыри и плотность', chat)}
        ${settingsSection('bluetooth', 'Bluetooth', 'Запасной канал без интернета', bluetooth)}
        ${settingsSection('bolt', 'Поведение', 'Связь и анимации', behavior)}
        ${settingsSection('server', 'Сервер', 'Основной канал связи', server)}
        ${settingsSection('database', 'Данные', 'История и сброс оформления', data)}
        ${settingsSection('info', 'О приложении', `UltraChat ${APP_VERSION}`, about)}
        <div class="app-version">UltraChat ${escapeHtml(APP_VERSION)} · сервер и веб-клиент</div>
      </div>`;
    root.scrollTop = oldScroll;
    updateServerWidgets();
    updateServerUrlHint();
  }

  function updateServerWidgets() {
    const dot = $('server-status-dot');
    const text = $('server-status-text');
    if (!dot || !text) return;
    const status = serverStateInfo();
    dot.classList.remove('tone-muted', 'tone-success', 'tone-danger', 'tone-accent', 'pulsing');
    dot.classList.add(...status.dot.split(' '));
    if (status.pulsing) dot.classList.add('pulsing');
    text.textContent = status.text;
  }

  function updateServerUrlHint() {
    const input = $('server-url-input');
    const hint = $('server-url-hint');
    if (!input || !hint) return;
    const value = String(input.value || '').trim();
    let message = '';
    if (value) {
      const normalized = normalizeServerUrl(value);
      if (!normalized) message = 'Проверьте адрес: нужен http:// или https:// и корректный хост.';
      else {
        try {
          const host = new URL(normalized).hostname;
          if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
            message = 'Это адрес локального компьютера — с другого устройства он будет недоступен.';
          }
        } catch {
          message = '';
        }
      }
    }
    hint.textContent = message;
    hint.classList.toggle('hidden', !message);
    hint.classList.toggle('error', false);
  }

  function updateServerSavedNote(saved) {
    const note = $('server-saved-note');
    if (!note) return;
    note.textContent = saved ? 'Параметры сохранены локально' : 'Токен хранится только на этом устройстве';
    note.classList.toggle('ok', saved);
    const button = q('[data-action="save-server"] span');
    if (button) button.textContent = saved ? 'Сохранено' : 'Сохранить';
  }

  function openSettings(fromOnboarding = false) {
    if (state.screen === 'settings' && !fromOnboarding) return;
    if (fromOnboarding || !state.me) {
      state.settingsFromOnboarding = true;
      state.settingsReturn = 'onboarding';
      state.serverDraft = { url: state.settings.serverUrl, token: state.settings.serverToken };
      state.serverSaved = false;
      $('onboarding').classList.add('hidden');
      $('shell').classList.remove('hidden');
      const sidebar = q('.sidebar');
      if (sidebar) sidebar.style.display = 'none';
      setScreen('settings');
      renderSettings();
      return;
    }
    state.settingsFromOnboarding = false;
    state.settingsReturn = state.screen === 'profile' ? 'profile' : state.screen;
    state.serverDraft = { url: state.settings.serverUrl, token: state.settings.serverToken };
    state.serverSaved = false;
    setScreen('settings');
    renderSettings();
  }

  function closeSettings() {
    if (state.settingsFromOnboarding) {
      state.settingsFromOnboarding = false;
      const sidebar = q('.sidebar');
      if (sidebar) sidebar.style.display = '';
      $('shell').classList.add('hidden');
      setScreen('empty');
      renderOnboarding();
      return;
    }
    const target = state.settingsReturn || 'empty';
    setScreen(target);
    if (target === 'chat' && state.activePeerId) {
      renderChatHeader();
      renderMessages();
    }
    if (target === 'profile') renderProfile();
    renderThreads();
  }

  function applySetting(key, value) {
    if (state.settings[key] === value) return;
    state.settings[key] = value;
    saveSettings();
    applySettings();
    haptic();
    renderSettings();
    if (key === 'autoReconnect' && value === true && !state.connected && !state.connecting && state.token) {
      connect();
    }
  }

  function saveServerSettings() {
    const urlInput = $('server-url-input');
    const tokenInput = $('server-token-input');
    if (!urlInput || !tokenInput) return;
    const raw = urlInput.value.trim();
    const normalized = raw ? normalizeServerUrl(raw) : '';
    if (raw && !normalized) {
      toast('Проверьте адрес сервера', { error: true });
      updateServerUrlHint();
      return;
    }
    const oldUrl = state.settings.serverUrl;
    const oldToken = state.settings.serverToken;
    state.settings.serverUrl = normalized || '';
    state.settings.serverToken = tokenInput.value.trim().slice(0, 300);
    state.serverDraft = { url: state.settings.serverUrl, token: state.settings.serverToken };
    urlInput.value = state.settings.serverUrl;
    state.serverSaved = true;
    saveSettings();
    updateServerSavedNote(true);
    updateServerUrlHint();
    renderSidebarFoot();
    updateServerWidgets();
    renderConnectionStatus();
    haptic();
    if (oldUrl !== state.settings.serverUrl || oldToken !== state.settings.serverToken) {
      state.attempts = 0;
      state.repairTried = false;
      state.bannerDismissed = false;
      if (state.token && state.me) {
        connect({ force: true });
      }
    }
    toast(state.settings.serverUrl ? 'Параметры сервера сохранены' : 'Сервер отключён');
  }

  function checkServerConnection() {
    const base = currentServer();
    if (!base) {
      toast('Сначала укажите адрес сервера', { error: true });
      return;
    }
    toast('Проверяю сервер…', { duration: 1600 });
    fetch(`${base}/health`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !data.ok) throw new Error('bad response');
        toast(`Сервер на связи · пользователей: ${Number(data.users) || 0}`);
      })
      .catch(() => toast('Сервер не отвечает. Проверьте адрес и интернет.', { error: true, duration: 3600 }));
  }

  function confirmResetSettings() {
    openDialog({
      icon: 'refresh',
      title: 'Сбросить настройки?',
      body: '<div class="dialog-copy">Тема, обои и поведение вернутся к стандартным. Профиль и история сообщений останутся на месте.</div>',
      confirmText: 'Сбросить',
      onConfirm: () => {
        const oldUrl = state.settings.serverUrl;
        state.settings = defaultSettings();
        state.serverDraft = { url: state.settings.serverUrl, token: state.settings.serverToken };
        state.serverSaved = false;
        saveSettings();
        applySettings();
        renderSettings();
        renderSidebarFoot();
        renderConnectionStatus();
        if (oldUrl !== state.settings.serverUrl && state.token && state.me) connect({ force: true });
        toast('Настройки сброшены');
      },
    });
  }

  function clearHistory() {
    clearHistoryStorage();
    state.threads.clear();
    state.messages.clear();
    state.drafts.clear();
    state.activePeerId = null;
    saveThreads();
    renderThreads();
    renderChatHeader();
    setScreen(state.screen === 'settings' ? 'settings' : 'empty');
    if (state.screen === 'settings') renderSettings();
    toast('История очищена');
  }

  function confirmClearHistory() {
    openDialog({
      title: 'Очистить историю?',
      body: '<div class="dialog-copy">Все сохранённые сообщения на этом устройстве будут удалены. Действие нельзя отменить.</div>',
      confirmText: 'Удалить',
      danger: true,
      onConfirm: clearHistory,
    });
  }

  function confirmDeleteAccount() {
    openDialog({
      icon: 'user',
      title: 'Удалить аккаунт?',
      body: '<div class="dialog-copy">Профиль, история чатов и настройки будут удалены с устройства. Вы вернётесь к экрану создания аккаунта. Восстановить данные нельзя.</div>',
      confirmText: 'Удалить',
      danger: true,
      onConfirm: deleteAccount,
    });
  }

  function deleteAccount() {
    disconnectSocket();
    clearAppStorage();
    state.me = null;
    state.token = '';
    state.threads.clear();
    state.messages.clear();
    state.roster.clear();
    state.drafts.clear();
    state.activePeerId = null;
    state.settings = defaultSettings();
    state.settingsFromOnboarding = false;
    state.settingsReturn = 'empty';
    state.profileDraft = null;
    state.screen = 'empty';
    state.onboardingStep = 0;
    state.signup = { nickname: '', avatarId: 'initials', photo: null, creator: false, mode: 'emoji' };
    state.signupError = '';
    state.deviceId = ensureDeviceId();
    state.connected = false;
    state.connecting = false;
    state.lastConnectionError = '';
    applySettings();
    const sidebar = q('.sidebar');
    if (sidebar) sidebar.style.display = '';
    $('shell').classList.add('hidden');
    setScreen('empty');
    renderOnboarding();
    toast('Аккаунт удалён');
  }

  // ------------------------------------------------------------------
  // Profile
  // ------------------------------------------------------------------

  function openProfile() {
    if (!state.me) return;
    if (state.screen === 'profile') return;
    state.profileReturn = state.screen === 'settings' ? 'settings' : state.screen;
    state.profileDraft = {
      id: state.me.id || '',
      nickname: state.me.nickname,
      creator: state.me.creator,
      avatarId: state.me.avatarId,
      photo: state.me.photo,
    };
    state.profileError = '';
    setScreen('profile');
    renderProfile();
  }

  function closeProfile() {
    const target = state.profileReturn || 'empty';
    setScreen(target);
    if (target === 'chat' && state.activePeerId) {
      renderChatHeader();
      renderMessages();
    }
    if (target === 'settings') renderSettings();
    renderThreads();
  }

  function renderProfile() {
    const root = $('profile-view');
    const draft = state.profileDraft;
    if (!root || !draft) return;
    const oldScroll = root.scrollTop;
    const creator = draft.creator === true;
    const role = creator ? 'СОЗДАТЕЛЬ' : 'ЛОКАЛЬНЫЙ ПРОФИЛЬ';
    const picker = AVATARS.map((avatar) => {
      const selected = avatar.id === draft.avatarId && !draft.photo;
      const content = avatar.emoji
        ? `<span>${escapeHtml(avatar.emoji)}</span>`
        : `<span class="picker-initials">${escapeHtml(initials(draft.nickname || 'Ultra'))}</span>`;
      return `<button class="picker-choice${selected ? ' selected' : ''}" type="button" data-action="profile-avatar" data-id="${avatar.id}" style="--choice-color:${avatar.color}" aria-label="Аватар ${avatar.id}">
        ${content}${selected ? `<span class="picker-check">${icon('check')}</span>` : ''}
      </button>`;
    }).join('');
    const creatorCard = creator ? `<div class="profile-block">
      <div class="creator-card">
        <span class="creator-icon">${icon('crown')}</span>
        <div><h3>Статус Создателя</h3><p>Префикс ${escapeHtml(CREATOR_PREFIX)} виден собеседнику.</p></div>
      </div>
    </div>` : '';
    const photoActions = `<div class="bt-actions" style="flex-direction:row;flex-wrap:wrap;margin-top:10px">
      <button class="mini-btn" type="button" data-action="profile-photo-pick">${icon('wallpaper')}${draft.photo ? 'Выбрать другое фото' : 'Загрузить фото'}</button>
      ${draft.photo ? `<button class="mini-btn" type="button" data-action="profile-photo-remove" style="background:var(--danger-14);color:var(--danger)">${icon('close')}Убрать фото</button>` : ''}
    </div>`;
    root.innerHTML = `<header class="profile-head">
        <button class="icon-btn" type="button" data-action="profile-close" aria-label="Назад">${icon('back')}</button>
        <div class="head-copy"><h1>Профиль</h1><p>Настройки профиля</p></div>
      </header>
      <div class="profile-scroll">
        <h1 class="profile-title">Ваш профиль</h1>
        <p class="profile-sub">Выберите имя и аватар. Всё хранится только на этом устройстве.</p>
        <div class="profile-hero">
          <button class="avatar-hit profile-avatar-hit" type="button" data-action="secret-tap" data-context="profile" aria-label="Аватар профиля">
            ${avatarHtml({ name: draft.nickname || 'Ultra', avatarId: draft.avatarId, photo: draft.photo, creator, size: 96 })}
          </button>
          <div class="profile-role${creator ? ' creator' : ''}" id="profile-role">${role}</div>
        </div>
        <div class="profile-block">
          <h2>Аватар</h2>
          <div class="avatar-picker">${picker}</div>
          ${photoActions}
        </div>
        ${creatorCard}
        <div class="profile-block">
          <h2>Имя</h2>
          <label class="field">${icon('user')}<input id="profile-nickname" type="text" maxlength="${MAX_NICKNAME}" autocomplete="nickname" placeholder="Например, Нова" value="${escapeAttr(draft.nickname)}" aria-label="Никнейм"></label>
          <div class="field-help${state.profileError ? ' error' : ''}" id="profile-error">${escapeHtml(state.profileError || `До ${MAX_NICKNAME} символов`)}</div>
        </div>
        <div class="profile-server-card">
          <span class="profile-server-icon">${icon('server')}</span>
          <div><h3>Сервер</h3><p>Основной канал связи. Bluetooth — запасной, без интернета.</p></div>
        </div>
        <div class="profile-save">
          <button class="primary-btn" type="button" data-action="profile-save"${normalizeNickname(draft.nickname) ? '' : ' disabled'}>${icon('chat')}<span>Сохранить</span></button>
        </div>
        <div class="profile-foot">${icon('shield')}<span>Сервер · фото · история на устройстве</span></div>
      </div>`;
    root.scrollTop = oldScroll;
  }

  function saveProfileDraft() {
    const draft = state.profileDraft;
    if (!draft) return;
    const clean = normalizeNickname(draft.nickname);
    if (!clean) {
      state.profileError = 'Введите никнейм';
      renderProfile();
      return;
    }
    const previous = state.me || {};
    state.me = {
      id: previous.id || draft.id || '',
      nickname: clean,
      creator: draft.creator === true,
      avatarId: normalizeAvatar(draft.avatarId),
      photo: draft.photo || null,
      displayName: displayName(clean, draft.creator === true),
    };
    state.profileError = '';
    saveProfile();
    renderMeButton();
    renderThreads();
    renderChatHeader();
    toast('Профиль сохранён');
    const identityChanged = previous.nickname !== state.me.nickname ||
      previous.creator !== state.me.creator ||
      previous.avatarId !== state.me.avatarId ||
      previous.photo !== state.me.photo;
    closeProfile();
    if (identityChanged && state.connected) reconnectSocket();
  }

  function handleProfileInput(event) {
    const input = event.target;
    if (!input || input.id !== 'profile-nickname' || !state.profileDraft) return;
    state.profileDraft.nickname = input.value.slice(0, MAX_NICKNAME);
    state.profileError = '';
    const help = $('profile-error');
    if (help) {
      help.textContent = `До ${MAX_NICKNAME} символов`;
      help.classList.remove('error');
    }
    const save = q('[data-action="profile-save"]');
    if (save) save.disabled = !normalizeNickname(state.profileDraft.nickname);
  }

  // ------------------------------------------------------------------
  // Search / add contact
  // ------------------------------------------------------------------

  function openAddContact() {
    if (!state.me) return;
    state.search.open = true;
    state.search.query = '';
    state.search.users = [];
    state.search.loading = false;
    state.search.error = '';
    const modal = $('add-contact-modal');
    const input = $('contact-search');
    if (!modal || !input) return;
    modal.classList.remove('hidden');
    input.value = '';
    renderSearchResults();
    requestAnimationFrame(() => input.focus());
  }

  function closeAddContact() {
    state.search.open = false;
    clearTimeout(state.search.timer);
    if (state.search.controller) {
      try {
        state.search.controller.abort();
      } catch {
        /* ignore */
      }
    }
    state.search.controller = null;
    const modal = $('add-contact-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderSearchResults() {
    const root = $('contact-results');
    if (!root) return;
    const search = state.search;
    const query = search.query.trim();
    if (search.loading) {
      root.innerHTML = '<div class="search-state"><span class="spinner"></span>Ищу…</div>';
      return;
    }
    if (search.error) {
      root.innerHTML = `<div class="search-state error">${escapeHtml(search.error)}</div>`;
      return;
    }
    if (!query) {
      root.innerHTML = '<div class="search-state">Начните вводить имя или ник.</div>';
      return;
    }
    if (query.length < 2) {
      root.innerHTML = '<div class="search-state">Введите хотя бы 2 символа.</div>';
      return;
    }
    if (!search.users.length) {
      root.innerHTML = '<div class="search-state">Никого не нашли. Попробуйте другое имя.</div>';
      return;
    }
    root.innerHTML = search.users.map((user) => {
      const creator = user.creator === true;
      const name = creator ? `${CREATOR_PREFIX} ${cleanDisplayName(user.displayName || user.nickname)}` : (user.displayName || user.nickname);
      return `<button class="contact-row" type="button" data-action="add-contact" data-id="${escapeAttr(user.id)}">
        ${avatarHtml({ name, avatarId: user.avatar || user.avatarId, creator, online: user.online, size: 42 })}
        <span class="contact-copy">
          <span class="contact-name${creator ? ' creator' : ''}">${escapeHtml(name)}</span>
          <span class="contact-status${user.online ? ' online' : ''}">${user.online ? 'В сети' : 'Не в сети'}</span>
        </span>
        <span class="contact-plus">${icon('plus')}</span>
      </button>`;
    }).join('');
  }

  function searchUsers(query) {
    const clean = query.trim().slice(0, 48);
    if (clean.length < 2) {
      if (state.search.controller) state.search.controller.abort();
      state.search.loading = false;
      state.search.users = [];
      state.search.error = '';
      renderSearchResults();
      return;
    }
    if (!currentServer()) {
      state.search.loading = false;
      state.search.users = [];
      state.search.error = 'Сервер не настроен. Укажите адрес в настройках.';
      renderSearchResults();
      return;
    }
    if (!state.token) {
      state.search.loading = false;
      state.search.users = [];
      state.search.error = 'Профиль ещё не подключён к серверу.';
      renderSearchResults();
      return;
    }
    if (state.search.controller) {
      try {
        state.search.controller.abort();
      } catch {
        /* ignore */
      }
    }
    const controller = new AbortController();
    state.search.controller = controller;
    state.search.loading = true;
    state.search.error = '';
    renderSearchResults();
    fetch(`${currentServer()}/api/search?q=${encodeURIComponent(clean)}`, {
      headers: { Authorization: `Bearer ${state.token}` },
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !data.ok) throw new Error('search failed');
        return data;
      })
      .then((data) => {
        if (!state.search.open || state.search.query.trim() !== clean) return;
        state.search.loading = false;
        state.search.users = Array.isArray(data.users) ? data.users : [];
        state.search.error = '';
        renderSearchResults();
      })
      .catch((error) => {
        if (error && error.name === 'AbortError') return;
        if (!state.search.open || state.search.query.trim() !== clean) return;
        state.search.loading = false;
        state.search.users = [];
        state.search.error = 'Нет связи с сервером. Проверьте интернет.';
        renderSearchResults();
      })
      .finally(() => {
        if (state.search.controller === controller) state.search.controller = null;
      });
  }

  function onContactSearchInput() {
    const input = $('contact-search');
    if (!input) return;
    state.search.query = input.value.slice(0, 48);
    state.search.users = [];
    state.search.error = '';
    const clean = state.search.query.trim();
    if (clean.length < 2 || !currentServer() || !state.token) {
      searchUsers(state.search.query);
      return;
    }
    state.search.loading = true;
    renderSearchResults();
    debounceSearch(() => searchUsers(state.search.query), 320);
  }

  function addContact(userId) {
    const user = state.search.users.find((item) => item.id === userId);
    if (!user) return;
    const creator = user.creator === true;
    const name = creator
      ? `${CREATOR_PREFIX} ${cleanDisplayName(user.displayName || user.nickname)}`
      : (user.displayName || user.nickname);
    state.roster.set(user.id, {
      id: user.id,
      nickname: user.nickname,
      displayName: name,
      creator,
      avatar: user.avatar || user.avatarId || 'initials',
      online: user.online === true,
      model: user.model || '',
      lastSeenAt: user.lastSeenAt || 0,
    });
    ensureThread(user.id, {
      title: name,
      creator,
      avatarId: normalizeAvatar(user.avatar || user.avatarId),
      online: user.online === true,
    });
    saveThreads();
    closeAddContact();
    openChat(user.id);
    toast(creator ? 'Создатель добавлен в чаты' : 'Собеседник добавлен в чаты');
  }

  // ------------------------------------------------------------------
  // Dialogs, creator unlock, photo picker
  // ------------------------------------------------------------------

  function openDialog(config) {
    const root = $('dialog-root');
    if (!root) return;
    state.dialog = { onConfirm: config.onConfirm, onCancel: config.onCancel };
    const iconHtml = config.icon
      ? `<div class="dialog-icon" style="${config.gold
        ? 'background:var(--gold-14);color:var(--gold)'
        : config.danger === false
          ? ''
          : 'background:var(--danger-14);color:var(--danger)'}">${icon(config.icon)}</div>`
      : '';
    root.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      ${iconHtml}
      <h2 id="dialog-title" style="${config.icon ? 'text-align:center' : ''}">${escapeHtml(config.title || '')}</h2>
      <div style="margin-top:${config.icon ? '10px' : '8px'}">${config.body || ''}</div>
      <div class="dialog-actions">
        ${config.hideCancel ? '' : `<button class="text-btn muted" type="button" data-dialog-cancel>${escapeHtml(config.cancelText || 'Отмена')}</button>`}
        ${config.hideConfirm ? '' : `<button class="text-btn${config.danger ? ' danger' : ''}" type="button" data-dialog-confirm${config.gold ? ' style="color:var(--gold)"' : ''}>${escapeHtml(config.confirmText || 'Готово')}</button>`}
      </div>
    </div>`;
    root.classList.remove('hidden');
    requestAnimationFrame(() => {
      const focus = root.querySelector('[data-autofocus]') || root.querySelector('input') || root.querySelector('[data-dialog-confirm]');
      if (focus) focus.focus();
      if (focus && focus.select && focus.tagName === 'INPUT') focus.select();
    });
  }

  function closeDialog(cancelled = false) {
    const root = $('dialog-root');
    const config = state.dialog;
    state.dialog = null;
    if (root) {
      root.classList.add('hidden');
      root.innerHTML = '';
    }
    if (cancelled && config && typeof config.onCancel === 'function') config.onCancel();
  }

  function confirmDialogAction() {
    const config = state.dialog;
    if (!config) return;
    let result;
    try {
      result = typeof config.onConfirm === 'function' ? config.onConfirm() : undefined;
    } catch (error) {
      toast('Не удалось выполнить действие', { error: true });
      result = false;
    }
    if (result !== false) closeDialog(false);
  }

  function openCreatorDialog(onSuccess) {
    openDialog({
      icon: 'crown',
      gold: true,
      title: 'Скрытый доступ',
      body: `<div class="dialog-copy">Введите код Создателя. Особый статус сохранится в профиле и будет виден собеседникам.</div>
        <div style="margin-top:14px">
          <span class="field-label">Код</span>
          <label class="field">${icon('lock')}<input id="creator-code" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="••••" data-autofocus aria-label="Код создателя"></label>
          <div class="field-help error hidden" id="creator-code-error">Код не подходит</div>
        </div>`,
      confirmText: 'Активировать',
      gold: true,
      onConfirm: () => {
        const input = $('creator-code');
        const value = input ? input.value.replace(/\D/g, '').slice(0, 8) : '';
        if (value !== CREATOR_CODE) {
          const error = $('creator-code-error');
          if (error) error.classList.remove('hidden');
          if (input) {
            const field = input.closest('.field');
            if (field) field.style.borderColor = 'var(--danger)';
            input.focus();
          }
          return false;
        }
        onSuccess();
        toast('Статус Создателя активирован');
        return true;
      },
    });
  }

  function openMessageMenu(id) {
    const peerId = state.activePeerId;
    if (!peerId || !id) return;
    const message = loadMessages(peerId).find((item) => item.id === id);
    if (!message || !message.mine) return;
    const preview = message.kind === 'image'
      ? 'Фото'
      : (message.text || 'Сообщение');
    const canEdit = message.kind === 'text';
    openDialog({
      title: 'Сообщение',
      hideConfirm: true,
      cancelText: 'Закрыть',
      body: `<div class="message-menu-preview">${escapeHtml(preview.slice(0, 240))}</div>
        <div class="message-menu-actions">
          ${canEdit ? `<button class="menu-action" type="button" data-action="message-edit" data-id="${escapeAttr(message.id)}">${icon('edit')}<span>Изменить текст</span></button>` : ''}
          <button class="menu-action danger" type="button" data-action="message-delete" data-id="${escapeAttr(message.id)}">${icon('trash')}<span>Удалить сообщение</span></button>
        </div>`,
    });
  }

  function openEditMessageDialog(id) {
    const peerId = state.activePeerId;
    if (!peerId || !id) return;
    const message = loadMessages(peerId).find((item) => item.id === id);
    if (!message || !message.mine || message.kind !== 'text') return;
    openDialog({
      title: 'Изменить сообщение',
      confirmText: 'Сохранить',
      danger: false,
      body: `<label class="field message-edit-field">
        <textarea id="edit-message-text" rows="4" maxlength="${MAX_TEXT}" data-autofocus>${escapeHtml(message.text)}</textarea>
      </label>
      <div class="field-help error hidden" id="edit-message-error">Текст не может быть пустым</div>`,
      onConfirm: () => {
        const input = $('edit-message-text');
        const text = input ? input.value.trim() : '';
        if (!text) {
          const error = $('edit-message-error');
          if (error) error.classList.remove('hidden');
          if (input) input.focus();
          return false;
        }
        if (!sendFrame({ type: 'edit', id, text })) {
          toast('Нет связи с сервером. Изменение не сохранено.', { error: true });
          return false;
        }
        return true;
      },
    });
  }

  function confirmDeleteMessage(id) {
    const peerId = state.activePeerId;
    if (!peerId || !id) return;
    const message = loadMessages(peerId).find((item) => item.id === id);
    if (!message || !message.mine) return;
    openDialog({
      icon: 'trash',
      title: 'Удалить сообщение?',
      body: '<div class="dialog-copy">Сообщение исчезнет у вас и у собеседника. Это действие нельзя отменить.</div>',
      confirmText: 'Удалить',
      danger: true,
      onConfirm: () => {
        if (!sendFrame({ type: 'delete', id })) {
          toast('Нет связи с сервером. Сообщение не удалено.', { error: true });
          return false;
        }
        return true;
      },
    });
  }

  function confirmDeleteChat() {
    const peerId = state.activePeerId;
    if (!peerId || isLobby(peerId)) return;
    const info = peerInfo(peerId);
    openDialog({
      icon: 'trash',
      title: 'Удалить чат?',
      body: `<div class="dialog-copy">Вся переписка с <b>${escapeHtml(info.shortTitle)}</b> будет удалена у вас и у собеседника. Фото тоже будут удалены с сервера.</div>`,
      confirmText: 'Удалить чат',
      danger: true,
      onConfirm: () => {
        if (!sendFrame({ type: 'delete_chat', peer: peerId })) {
          toast('Нет связи с сервером. Чат не удалён.', { error: true });
          return false;
        }
        clearChatLocal(peerId);
        toast('Чат удалён');
        return true;
      },
    });
  }

  function handleSecretTap(context) {
    const active = context === 'signup'
      ? (state.signup && state.signup.creator)
      : (state.profileDraft && state.profileDraft.creator);
    if (active) return;
    const now = Date.now();
    if (!state.tap.at || now - state.tap.at > TAP_WINDOW_MS || state.tap.context !== context) {
      state.tap = { count: 1, at: now, context };
      return;
    }
    state.tap.count += 1;
    if (state.tap.count >= SECRET_TAPS) {
      state.tap = { count: 0, at: 0, context: '' };
      openCreatorDialog(() => {
        if (context === 'signup') {
          state.signup.creator = true;
          renderOnboarding();
        } else if (state.profileDraft) {
          state.profileDraft.creator = true;
          renderProfile();
        }
      });
    }
  }

  function pickPhoto(context) {
    state.photoContext = context;
    const input = $('avatar-file');
    if (input) {
      input.value = '';
      input.click();
    }
  }

  function removeProfilePhoto() {
    if (!state.profileDraft) return;
    state.profileDraft.photo = null;
    renderProfile();
  }

  // ------------------------------------------------------------------
  // Registration and networking
  // ------------------------------------------------------------------

  state.pending = new Map();
  state.lastPendingId = null;

  function registrationErrorMessage(error) {
    switch (error && error.code) {
      case 'server_required':
        return 'Сначала укажите адрес сервера в настройках.';
      case 'rate_limited':
        return 'Слишком много попыток. Подождите минуту и попробуйте снова.';
      case 'device_id_required':
        return 'Не удалось создать идентификатор устройства. Перезагрузите страницу.';
      case 'nickname_required':
        return 'Введите никнейм.';
      case 'network':
        return 'Не удалось подключиться к серверу. Проверьте интернет или адрес в настройках.';
      default:
        return (error && error.message) || 'Не удалось создать аккаунт. Попробуйте ещё раз.';
    }
  }

  async function registerProfile(options) {
    const base = currentServer();
    if (!base) {
      const error = new Error('server_required');
      error.code = 'server_required';
      throw error;
    }
    let response;
    try {
      response = await fetch(`${base}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          deviceId: state.deviceId,
          nickname: options.nickname,
          avatarId: normalizeAvatar(options.avatarId),
          creator: options.creator === true,
          model: 'web',
          token: options.token || undefined,
        }),
      });
    } catch {
      const error = new Error('network');
      error.code = 'network';
      throw error;
    }
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    if (!response.ok || !data || data.ok !== true) {
      const code = data && data.error ? data.error : `http_${response.status}`;
      const error = new Error(code);
      error.code = code;
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function applyRegisterData(data, fallback = {}) {
    state.token = data.token || state.token;
    try {
      localStorage.setItem(STORAGE.token, state.token);
    } catch {
      /* ignore */
    }
    const nickname = normalizeNickname(data.nickname || fallback.nickname || (state.me && state.me.nickname) || '');
    const creator = data.creator === true;
    const previous = state.me || {};
    state.me = {
      id: data.userId || previous.id || '',
      nickname,
      creator,
      avatarId: normalizeAvatar(data.avatarId || fallback.avatarId || previous.avatarId),
      photo: fallback.photo !== undefined ? fallback.photo : (previous.photo || null),
      displayName: data.displayName || displayName(nickname, creator),
    };
    saveProfile();
    renderMeButton();
  }

  async function completeSignUp() {
    if (state.signupBusy) return;
    const clean = normalizeNickname(state.signup.nickname);
    if (clean.length < 2) {
      state.signupError = 'Никнейм минимум 2 символа';
      renderOnboarding();
      return;
    }
    if (!currentServer()) {
      state.signupError = 'Сначала укажите адрес сервера в настройках.';
      renderOnboarding();
      return;
    }
    state.signupBusy = true;
    state.signupError = '';
    updateSignupNext();
    try {
      const data = await registerProfile({
        nickname: clean,
        avatarId: state.signup.avatarId,
        creator: state.signup.creator === true,
        token: state.token || null,
      });
      applyRegisterData(data, {
        nickname: clean,
        avatarId: state.signup.avatarId,
        photo: state.signup.photo || null,
      });
      state.signupBusy = false;
      state.onboardingStep = 0;
      state.signupError = '';
      showShell();
      setScreen('empty');
      renderThreads();
      renderSidebarFoot();
      renderConnectionStatus();
      connect();
      toast(data.created ? `Добро пожаловать, ${clean}!` : `С возвращением, ${clean}!`);
    } catch (error) {
      state.signupBusy = false;
      state.signupError = registrationErrorMessage(error);
      renderOnboarding();
    }
  }

  async function repairRegistration() {
    if (!state.me || !state.token) throw new Error('nothing to repair');
    const data = await registerProfile({
      nickname: state.me.nickname,
      avatarId: state.me.avatarId,
      creator: state.me.creator === true,
      token: state.token,
    });
    applyRegisterData(data, { photo: state.me.photo });
  }

  function buildWsUrl() {
    const base = currentServer();
    if (!base) return '';
    const wsBase = base.replace(/^http/i, 'ws');
    return `${wsBase}/ws?token=${encodeURIComponent(state.token)}`;
  }

  function sendFrame(payload) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN || !state.connected) return false;
    try {
      state.ws.send(JSON.stringify({ v: VERSION, ...payload }));
      return true;
    } catch {
      return false;
    }
  }

  function startPing() {
    clearInterval(state.pingTimer);
    state.pingTimer = setInterval(() => {
      sendFrame({ type: 'ping', ts: Date.now() });
    }, 45000);
  }

  function scheduleReconnect(customDelay) {
    if (!state.settings.autoReconnect || !state.token || !state.me || !currentServer()) return;
    clearTimeout(state.reconnectTimer);
    state.attempts += 1;
    const delay = customDelay != null
      ? customDelay
      : Math.min(15000, 1000 * (2 ** Math.min(state.attempts - 1, 4)));
    state.reconnectTimer = setTimeout(() => {
      if (!state.connected) connect();
    }, delay);
  }

  function connect(options = {}) {
    if (!state.token || !state.me) return;
    if (!currentServer()) {
      state.connected = false;
      state.connecting = false;
      state.lastConnectionError = '';
      clearInterval(state.pingTimer);
      renderConnectionStatus();
      updateSendState();
      return;
    }
    if (options.force) {
      state.wsGen += 1;
      const old = state.ws;
      state.ws = null;
      if (old) {
        try {
          old.close(1000, 'reconnect');
        } catch {
          /* ignore */
        }
      }
      clearInterval(state.pingTimer);
    }
    if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) return;
    clearTimeout(state.reconnectTimer);
    state.connecting = true;
    state.connected = false;
    state.lastConnectionError = '';
    state.bannerDismissed = false;
    const gen = ++state.wsGen;
    let ws;
    try {
      ws = new WebSocket(buildWsUrl());
    } catch {
      state.connecting = false;
      state.lastConnectionError = 'Не удалось открыть WebSocket';
      renderConnectionStatus();
      updateSendState();
      scheduleReconnect();
      return;
    }
    state.ws = ws;
    let welcomed = false;
    renderConnectionStatus();
    updateSendState();

    ws.onopen = () => {
      if (gen !== state.wsGen) return;
      try {
        ws.send(JSON.stringify({
          v: VERSION,
          type: 'hello',
          deviceId: state.deviceId,
          nickname: state.me.nickname,
          creator: state.me.creator === true,
          avatar: state.me.avatarId,
          model: 'web',
        }));
      } catch {
        try {
          ws.close(4000, 'hello failed');
        } catch {
          /* ignore */
        }
      }
    };

    ws.onmessage = (event) => {
      if (gen !== state.wsGen) return;
      let frame;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!frame || frame.v !== VERSION) return;
      if (frame.type === 'welcome') welcomed = true;
      handleFrame(frame);
    };

    ws.onerror = () => {
      /* onclose handles cleanup */
    };

    ws.onclose = () => {
      if (gen !== state.wsGen) return;
      state.ws = null;
      clearInterval(state.pingTimer);
      state.connected = false;
      state.connecting = false;
      state.lastConnectionError = navigator.onLine ? 'Сервер не отвечает' : 'Нет интернета';
      state.bannerDismissed = false;
      renderConnectionStatus();
      updateSendState();
      if (!welcomed && state.token && state.me && !state.repairTried) {
        state.repairTried = true;
        repairRegistration()
          .then(() => scheduleReconnect(200))
          .catch(() => scheduleReconnect());
      } else {
        scheduleReconnect();
      }
    };
  }

  function disconnectSocket() {
    state.wsGen += 1;
    clearInterval(state.pingTimer);
    clearTimeout(state.reconnectTimer);
    const ws = state.ws;
    state.ws = null;
    state.connected = false;
    state.connecting = false;
    if (ws) {
      try {
        ws.close(1000, 'client disconnect');
      } catch {
        /* ignore */
      }
    }
    updateSendState();
  }

  function reconnectSocket() {
    if (!state.token || !state.me) return;
    state.repairTried = false;
    connect({ force: true });
  }

  function requestHistory(peerId) {
    if (!peerId) return;
    sendFrame({ type: 'history', peer: peerId, limit: 80 });
  }

  function normalizeMessage(raw, peerId) {
    const mine = !!(state.me && state.me.id && raw.from === state.me.id);
    return {
      id: String(raw.id || ''),
      from: String(raw.from || ''),
      to: raw.to ? String(raw.to) : null,
      sender: String(raw.sender || ''),
      creator: raw.creator === true,
      text: String(raw.text || ''),
      kind: raw.kind === 'image' ? 'image' : 'text',
      image: raw.image ? String(raw.image) : null,
      localImage: null,
      ts: Number(raw.ts) || Date.now(),
      readAt: Number(raw.readAt) || 0,
      editedAt: Number(raw.editedAt) || 0,
      mine,
      pending: false,
      failed: false,
    };
  }

  function appendMessage(peerId, message) {
    const list = loadMessages(peerId);
    const existing = list.find((item) => item.id === message.id);
    if (existing) {
      Object.assign(existing, message, {
        localImage: existing.localImage || message.localImage || null,
        pending: message.pending === true,
        failed: message.failed === true,
      });
    } else {
      list.push(message);
    }
    list.sort((a, b) => a.ts - b.ts);
    if (list.length > MAX_MESSAGES_PER_PEER) list.splice(0, list.length - MAX_MESSAGES_PER_PEER);
    state.messages.set(peerId, list);
    saveMessages(peerId);
    return message;
  }

  function updateThreadAfterMessage(peerId, message) {
    const list = loadMessages(peerId);
    const last = list[list.length - 1] || message;
    const thread = ensureThread(peerId);
    if (peerId === LOBBY_ID) {
      thread.title = LOBBY_TITLE;
      thread.creator = false;
    } else if (!thread.title || thread.title === 'Собеседник' || thread.title === '') {
      if (message && !message.mine) {
        const name = cleanDisplayName(message.sender);
        if (name) thread.title = name;
      }
    }
    if (message && message.creator && peerId !== LOBBY_ID) thread.creator = true;
    thread.lastText = messagePreview(last);
    thread.lastTs = Number(last.ts) || Date.now();
    thread.lastIsMine = last.mine === true;
    thread.count = list.length;
    saveThreads();
  }

  function addIncomingMessage(peerId, message) {
    appendMessage(peerId, message);
    updateThreadAfterMessage(peerId, message);
    renderThreads();
    if (state.activePeerId === peerId) {
      renderMessages();
      renderChatHeader();
      if (!message.mine && !isLobby(peerId)) markChatRead(peerId);
    }
  }

  function mergeHistory(peerId, rawMessages) {
    if (!peerId || !Array.isArray(rawMessages)) return;
    const list = loadMessages(peerId);
    const byId = new Map(list.map((message) => [message.id, message]));
    let lastAdded = null;
    for (const raw of rawMessages) {
      if (!raw || !raw.id) continue;
      const message = normalizeMessage(raw, peerId);
      const existing = byId.get(message.id);
      if (existing) {
        const localImage = existing.localImage;
        Object.assign(existing, message, { localImage, pending: false, failed: false });
      } else {
        byId.set(message.id, message);
      }
      lastAdded = byId.get(message.id);
    }
    const merged = Array.from(byId.values()).sort((a, b) => a.ts - b.ts);
    if (merged.length > MAX_MESSAGES_PER_PEER) merged.splice(0, merged.length - MAX_MESSAGES_PER_PEER);
    state.messages.set(peerId, merged);
    saveMessages(peerId);
    if (!state.threads.has(peerId) && merged.length === 0) return;
    const last = merged[merged.length - 1];
    const thread = ensureThread(peerId);
    if (peerId === LOBBY_ID) {
      thread.title = LOBBY_TITLE;
      thread.creator = false;
      thread.avatarId = 'initials';
    }
    if (last) {
      if (peerId !== LOBBY_ID && (!thread.title || thread.title === 'Собеседник')) {
        const incoming = [...merged].reverse().find((message) => !message.mine);
        if (incoming) {
          const name = cleanDisplayName(incoming.sender);
          if (name) thread.title = name;
          if (incoming.creator) thread.creator = true;
        }
      }
      if (last.creator && peerId !== LOBBY_ID) thread.creator = true;
      thread.lastText = messagePreview(last);
      thread.lastTs = last.ts;
      thread.lastIsMine = last.mine === true;
      thread.count = merged.length;
      saveThreads();
    } else if (lastAdded) {
      thread.count = merged.length;
      saveThreads();
    }
    renderThreads();
    if (state.activePeerId === peerId) {
      renderMessages();
      renderChatHeader();
      markChatRead(peerId);
    }
  }

  function peerForMessageFrame(frame) {
    if (!frame.to) return LOBBY_ID;
    const me = state.me ? state.me.id : '';
    return frame.from === me ? String(frame.to) : String(frame.from);
  }

  function markChatRead(peerId) {
    if (!peerId || isLobby(peerId) || !state.connected) return;
    if (state.activePeerId !== peerId) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const list = loadMessages(peerId);
    let upTo = 0;
    for (const message of list) {
      if (!message.mine && Number(message.ts) > upTo) upTo = Number(message.ts);
    }
    if (!upTo) return;
    clearTimeout(state.readTimers.get(peerId));
    const timer = setTimeout(() => {
      state.readTimers.delete(peerId);
      if (!state.connected || state.activePeerId !== peerId) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      sendFrame({ type: 'read', peer: peerId, upTo });
    }, 220);
    state.readTimers.set(peerId, timer);
  }

  function handleReadReceipt(frame) {
    const peerId = String(frame.peer || '');
    const upTo = Number(frame.upTo) || 0;
    if (!peerId || !upTo) return;
    const list = loadMessages(peerId);
    const at = Number(frame.at) || Date.now();
    let changed = false;
    for (const message of list) {
      if (message.mine && !message.readAt && Number(message.ts) <= upTo) {
        message.readAt = at;
        changed = true;
      }
    }
    if (!changed) return;
    saveMessages(peerId);
    if (state.activePeerId === peerId) renderMessages();
  }

  function refreshThreadFromMessages(peerId) {
    const thread = state.threads.get(peerId);
    if (!thread) return;
    const list = loadMessages(peerId);
    const last = list[list.length - 1];
    thread.lastText = last ? messagePreview(last) : '';
    thread.lastTs = last ? Number(last.ts) || 0 : 0;
    thread.lastIsMine = last ? last.mine === true : false;
    thread.count = list.length;
    if (peerId === LOBBY_ID) {
      thread.title = LOBBY_TITLE;
      thread.creator = false;
    }
    saveThreads();
  }

  function removeMessageLocal(peerId, id) {
    const list = loadMessages(peerId);
    const index = list.findIndex((message) => message.id === id);
    if (index < 0) return false;
    list.splice(index, 1);
    state.messages.set(peerId, list);
    saveMessages(peerId);
    refreshThreadFromMessages(peerId);
    return true;
  }

  function handleEditFrame(frame) {
    const peerId = peerForMessageFrame(frame);
    const list = loadMessages(peerId);
    const message = list.find((item) => item.id === frame.id);
    if (!message) return;
    message.text = String(frame.text || '');
    message.editedAt = Number(frame.editedAt) || Date.now();
    message.pending = false;
    message.failed = false;
    saveMessages(peerId);
    refreshThreadFromMessages(peerId);
    renderThreads();
    if (state.activePeerId === peerId) renderMessages();
  }

  function handleDeleteFrame(frame) {
    const peerId = peerForMessageFrame(frame);
    if (!removeMessageLocal(peerId, String(frame.id || ''))) return;
    renderThreads();
    if (state.activePeerId === peerId) renderMessages();
  }

  function clearChatLocal(peerId) {
    state.messages.delete(peerId);
    try {
      localStorage.removeItem(`${STORAGE.history}${peerId}`);
    } catch {
      /* ignore */
    }
    state.threads.delete(peerId);
    saveThreads();
    if (state.activePeerId === peerId) {
      state.activePeerId = null;
      clearTypingIndicator();
      setScreen('empty');
    }
    renderThreads();
  }

  function handleChatDeleted(frame) {
    const peerId = String(frame.peer || '');
    if (!peerId) return;
    clearChatLocal(peerId);
    toast('Собеседник удалил переписку');
  }

  function handleLobbyCleared() {
    state.messages.set(LOBBY_ID, []);
    try {
      localStorage.removeItem(`${STORAGE.history}${LOBBY_ID}`);
    } catch {
      /* ignore */
    }
    const thread = ensureLobbyThread();
    if (thread) {
      thread.lastText = '';
      thread.lastTs = 0;
      thread.lastIsMine = false;
      thread.count = 0;
      saveThreads();
    }
    renderThreads();
    if (state.activePeerId === LOBBY_ID) renderMessages();
    toast('Общий чат очищен администратором');
  }

  function handleAck(frame) {
    const peerId = state.pending.get(frame.id);
    if (!peerId) return;
    state.pending.delete(frame.id);
    if (state.lastPendingId === frame.id) state.lastPendingId = null;
    const message = loadMessages(peerId).find((item) => item.id === frame.id);
    if (!message) return;
    message.pending = false;
    message.failed = false;
    message.ts = Number(frame.ts) || message.ts;
    message.mine = true;
    saveMessages(peerId);
    updateThreadAfterMessage(peerId, message);
    if (state.activePeerId === peerId) {
      renderMessages();
      renderChatHeader();
    }
    renderThreads();
    if (message.kind === 'image' && !message.image) requestHistory(peerId);
  }

  function markPendingFailed(id) {
    if (!id) return;
    const peerId = state.pending.get(id);
    if (!peerId) return;
    state.pending.delete(id);
    if (state.lastPendingId === id) state.lastPendingId = null;
    const message = loadMessages(peerId).find((item) => item.id === id);
    if (!message) return;
    message.pending = false;
    message.failed = true;
    saveMessages(peerId);
    updateThreadAfterMessage(peerId, message);
    if (state.activePeerId === peerId) renderMessages();
    renderThreads();
  }

  function handleServerError(frame) {
    const code = String(frame.code || '');
    if (['rate_limited', 'bad_image', 'media_failed', 'empty_text', 'unknown_user', 'self_message', 'bad_json', 'hello_required'].includes(code)) {
      if (state.lastPendingId) markPendingFailed(state.lastPendingId);
    }
    if (code === 'device_mismatch' || code === 'hello_timeout') {
      state.repairTried = false;
      const ws = state.ws;
      if (ws) {
        try {
          ws.close(4002, 'identity error');
        } catch {
          /* ignore */
        }
      }
    }
    const message = frame.message || {
      rate_limited: 'Слишком часто. Подождите пару секунд.',
      bad_image: 'Фото не принято: нужен JPEG, PNG или WebP до 1,8 МБ.',
      media_failed: 'Не удалось сохранить фото.',
      empty_text: 'Пустое сообщение.',
      unknown_user: 'Получатель не найден.',
      self_message: 'Нельзя писать себе.',
      message_not_editable: 'Это сообщение нельзя изменить.',
      message_not_found: 'Сообщение уже удалено.',
      banned: 'Доступ заблокирован администратором.',
      kicked: 'Сеанс завершён администратором.',
    }[code] || 'Ошибка сервера';
    toast(message, { error: true, duration: code === 'banned' || code === 'kicked' ? 6000 : 3400 });
  }

  function handleTyping(frame) {
    if (!frame.from || frame.from !== state.activePeerId) return;
    state.typingPeerId = frame.from;
    clearTimeout(state.typingTimer);
    state.typingTimer = setTimeout(() => {
      state.typingPeerId = null;
      state.typingTimer = null;
      renderChatHeader();
    }, 3500);
    renderChatHeader();
  }

  function clearTypingIndicator() {
    clearTimeout(state.typingTimer);
    state.typingTimer = null;
    state.typingPeerId = null;
  }

  function handleFrame(frame) {
    switch (frame.type) {
      case 'welcome': {
        state.connected = true;
        state.connecting = false;
        state.lastConnectionError = '';
        state.attempts = 0;
        state.repairTried = false;
        state.bannerDismissed = false;
        if (Number.isFinite(Number(frame.online))) state.onlineCount = Number(frame.online);
        if (state.me) {
          if (frame.userId) state.me.id = frame.userId;
          if (frame.nickname) state.me.nickname = normalizeNickname(frame.nickname);
          state.me.creator = frame.creator === true;
          state.me.avatarId = normalizeAvatar(frame.avatar || state.me.avatarId);
          state.me.displayName = frame.displayName || displayName(state.me.nickname, state.me.creator);
          saveProfile();
        }
        renderMeButton();
        renderConnectionStatus();
        renderThreads();
        updateSendState();
        startPing();
        if (state.activePeerId) {
          requestHistory(state.activePeerId);
          if (!loadMessages(state.activePeerId).length) renderMessages();
          renderChatHeader();
          markChatRead(state.activePeerId);
        }
        break;
      }
      case 'roster': {
        state.roster.clear();
        state.onlineCount = Number(frame.online) || 0;
        for (const user of Array.isArray(frame.users) ? frame.users : []) {
          if (!user || !user.id) continue;
          state.roster.set(user.id, user);
        }
        for (const thread of state.threads.values()) {
          const user = state.roster.get(thread.id);
          if (user) {
            thread.title = cleanDisplayName(user.displayName || user.nickname) || thread.title;
            thread.creator = user.creator === true;
            thread.avatarId = normalizeAvatar(user.avatar || thread.avatarId);
            thread.online = user.online === true;
          } else {
            thread.online = false;
          }
        }
        saveThreads();
        renderThreads();
        renderChatHeader();
        renderMeButton();
        break;
      }
      case 'history':
        if (frame.peer) mergeHistory(frame.peer, frame.messages);
        break;
      case 'chat': {
        if (!frame.id) break;
        const mine = !!(state.me && frame.from === state.me.id);
        const peerId = frame.to ? (mine ? String(frame.to) : String(frame.from)) : LOBBY_ID;
        if (!peerId || (state.me && peerId === state.me.id)) break;
        const message = normalizeMessage(frame, peerId);
        addIncomingMessage(peerId, message);
        break;
      }
      case 'ack':
        handleAck(frame);
        break;
      case 'read':
        handleReadReceipt(frame);
        break;
      case 'edit':
        handleEditFrame(frame);
        break;
      case 'delete':
        handleDeleteFrame(frame);
        break;
      case 'chat_deleted':
        handleChatDeleted(frame);
        break;
      case 'lobby_cleared':
        handleLobbyCleared();
        break;
      case 'notice':
        showNotice(frame);
        break;
      case 'notice_cleared':
        state.notice = null;
        renderNotice();
        break;
      case 'typing':
        handleTyping(frame);
        break;
      case 'error':
        handleServerError(frame);
        break;
      case 'pong':
      default:
        break;
    }
  }

  function markSendFailed(messageId, peerId) {
    const message = loadMessages(peerId).find((item) => item.id === messageId);
    if (!message) return;
    state.pending.delete(messageId);
    if (state.lastPendingId === messageId) state.lastPendingId = null;
    message.pending = false;
    message.failed = true;
    saveMessages(peerId);
    updateThreadAfterMessage(peerId, message);
    if (state.activePeerId === peerId) renderMessages();
    renderThreads();
  }

  function queueOutgoingMessage(peerId, message, frame) {
    appendMessage(peerId, message);
    state.pending.set(message.id, peerId);
    state.lastPendingId = message.id;
    updateThreadAfterMessage(peerId, message);
    renderThreads();
    if (state.activePeerId === peerId) renderMessages({ forceScroll: true });
    if (!sendFrame(frame)) {
      markSendFailed(message.id, peerId);
      toast('Нет связи с сервером. Сообщение не отправлено.', { error: true });
      return false;
    }
    return true;
  }

  function makeId() {
    try {
      return crypto.randomUUID();
    } catch {
      return `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }

  function submitMessage() {
    const input = $('message-input');
    const peerId = state.activePeerId;
    if (!input || !peerId) return;
    const text = input.value.trim();
    if (!text) return;
    if (!state.connected) {
      toast('Нет связи с сервером. Сообщение не отправлено.', { error: true });
      return;
    }
    const id = makeId();
    const ts = Date.now();
    const lobbyMessage = isLobby(peerId);
    const message = {
      id,
      from: state.me ? state.me.id : '',
      to: lobbyMessage ? null : peerId,
      sender: state.me ? state.me.displayName : '',
      creator: !!(state.me && state.me.creator),
      text: text.slice(0, MAX_TEXT),
      kind: 'text',
      image: null,
      localImage: null,
      ts,
      readAt: 0,
      editedAt: 0,
      mine: true,
      pending: true,
      failed: false,
    };
    input.value = '';
    state.drafts.delete(peerId);
    autoGrowInput();
    updateSendState();
    haptic();
    queueOutgoingMessage(peerId, message, {
      type: 'chat',
      to: lobbyMessage ? null : peerId,
      id,
      text: message.text,
      kind: 'text',
      ts,
    });
    input.focus();
  }

  function sendImage(peerId, dataUrl) {
    if (!peerId || !dataUrl) return;
    if (!state.connected) {
      toast('Нет связи с сервером. Фото не отправлено.', { error: true });
      return;
    }
    const id = makeId();
    const ts = Date.now();
    const lobbyMessage = isLobby(peerId);
    const message = {
      id,
      from: state.me ? state.me.id : '',
      to: lobbyMessage ? null : peerId,
      sender: state.me ? state.me.displayName : '',
      creator: !!(state.me && state.me.creator),
      text: '',
      kind: 'image',
      image: null,
      localImage: dataUrl,
      ts,
      readAt: 0,
      editedAt: 0,
      mine: true,
      pending: true,
      failed: false,
    };
    queueOutgoingMessage(peerId, message, {
      type: 'chat',
      to: lobbyMessage ? null : peerId,
      id,
      text: '',
      kind: 'image',
      image: dataUrl,
      ts,
    });
  }

  // ------------------------------------------------------------------
  // Images
  // ------------------------------------------------------------------

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('image failed'));
      image.src = source;
    });
  }

  function dataUrlByteLength(dataUrl) {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return 0;
    const base64 = dataUrl.slice(comma + 1);
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.floor((base64.length * 3) / 4) - padding;
  }

  async function compressAvatar(file) {
    const source = await readFileAsDataUrl(file);
    const image = await loadImage(source);
    const side = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const sx = ((image.naturalWidth || image.width) - side) / 2;
    const sy = ((image.naturalHeight || image.height) - side) / 2;
    const target = 320;
    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas failed');
    ctx.fillStyle = '#1C2733';
    ctx.fillRect(0, 0, target, target);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, sx, sy, side, side, 0, 0, target, target);
    return canvas.toDataURL('image/jpeg', 0.86);
  }

  async function compressChatPhoto(file) {
    const source = await readFileAsDataUrl(file);
    const image = await loadImage(source);
    let maxSide = 1600;
    let quality = 0.82;
    let result = '';
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const originalW = image.naturalWidth || image.width;
      const originalH = image.naturalHeight || image.height;
      const scale = Math.min(1, maxSide / Math.max(originalW, originalH));
      const width = Math.max(1, Math.round(originalW * scale));
      const height = Math.max(1, Math.round(originalH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas failed');
      ctx.fillStyle = '#1C2733';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, width, height);
      result = canvas.toDataURL('image/jpeg', quality);
      if (dataUrlByteLength(result) <= 1_550_000) return result;
      if (quality > 0.5) quality -= 0.1;
      else maxSide = Math.round(maxSide * 0.8);
    }
    if (dataUrlByteLength(result) > 1_800_000) throw new Error('too large');
    return result;
  }

  function openLightbox(source) {
    const box = $('lightbox');
    const image = $('lightbox-img');
    if (!box || !image || !source) return;
    image.src = source;
    box.classList.remove('hidden');
  }

  function closeLightbox() {
    const box = $('lightbox');
    const image = $('lightbox-img');
    if (box) box.classList.add('hidden');
    if (image) image.removeAttribute('src');
  }

  async function handleAvatarFile(file) {
    if (!file) return;
    const context = state.photoContext;
    state.photoContext = null;
    try {
      const dataUrl = await compressAvatar(file);
      if (context === 'profile') {
        if (!state.profileDraft) return;
        state.profileDraft.photo = dataUrl;
        renderProfile();
        toast('Фото выбрано. Нажмите «Сохранить»');
      } else {
        state.signup.photo = dataUrl;
        state.signup.mode = 'photo';
        renderOnboarding();
        toast('Фото выбрано');
      }
    } catch {
      toast('Не удалось открыть фото', { error: true });
    }
  }

  async function handleChatPhotoFile(file) {
    if (!file) return;
    const context = state.photoContext;
    state.photoContext = null;
    const peerId = context && context.startsWith('chat:') ? context.slice(5) : state.activePeerId;
    if (!peerId) return;
    if (!state.connected) {
      toast('Нет связи с сервером. Фото не отправлено.', { error: true });
      return;
    }
    toast('Готовлю фото…', { duration: 1500 });
    try {
      const dataUrl = await compressChatPhoto(file);
      sendImage(peerId, dataUrl);
    } catch {
      toast('Не удалось подготовить фото. Выберите файл поменьше.', { error: true });
    }
  }

  function pickChatPhoto() {
    const peerId = state.activePeerId;
    if (!peerId) return;
    if (!state.connected) {
      toast('Нет связи с сервером', { error: true });
      return;
    }
    state.photoContext = `chat:${peerId}`;
    const input = $('photo-file');
    if (input) {
      input.value = '';
      input.click();
    }
  }

  // ------------------------------------------------------------------
  // Screen extras
  // ------------------------------------------------------------------

  async function updateWakeLock() {
    if (!('wakeLock' in navigator)) return;
    const should = state.settings.keepScreenOn === true && state.screen === 'chat' && !document.hidden;
    if (should && !state.wakeLock) {
      try {
        state.wakeLock = await navigator.wakeLock.request('screen');
        state.wakeLock.addEventListener('release', () => {
          state.wakeLock = null;
        });
      } catch {
        state.wakeLock = null;
      }
    } else if (!should && state.wakeLock) {
      try {
        await state.wakeLock.release();
      } catch {
        /* ignore */
      }
      state.wakeLock = null;
    }
  }

  // ------------------------------------------------------------------
  // Hidden admin panel
  // ------------------------------------------------------------------

  function adminBaseUrl() {
    return currentServer() || DEFAULT_SERVER;
  }

  function adminErrorText(code) {
    return {
      bad_password: 'Неверный пароль',
      unauthorized: 'Сессия истекла. Войдите снова.',
      admin_disabled: 'Пароль администратора не настроен на сервере',
      rate_limited: 'Слишком много попыток. Подождите минуту.',
      bad_ip: 'Некорректный IP-адрес',
      bad_device: 'Слишком короткий ID устройства',
      value_required: 'Укажите значение',
    }[String(code || '')] || '';
  }

  async function adminRequest(path, options = {}) {
    const headers = { Accept: 'application/json' };
    if (options.body) headers['Content-Type'] = 'application/json';
    if (state.admin.token) headers.Authorization = `Bearer ${state.admin.token}`;
    let response;
    try {
      response = await fetch(`${adminBaseUrl()}${path}`, { ...options, headers });
    } catch {
      throw new Error('Нет связи с сервером');
    }
    let data = {};
    try {
      data = await response.json();
    } catch {
      /* ignore */
    }
    if (response.status === 401) {
      adminLogout(true);
      throw new Error('Сессия истекла. Войдите снова.');
    }
    if (!response.ok || data.ok === false) {
      throw new Error(data.message || adminErrorText(data.error) || 'Ошибка сервера');
    }
    return data;
  }

  function openAdminLogin() {
    if (!state.me) {
      toast('Сначала создайте аккаунт', { error: true });
      return;
    }
    if (state.admin.token) {
      openAdminPanel();
      return;
    }
    closeDialog(true);
    const layer = $('admin-login');
    if (!layer) return;
    const error = $('admin-login-error');
    if (error) {
      error.textContent = '';
      error.classList.add('hidden');
    }
    layer.classList.remove('hidden');
    const input = $('admin-password');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 40);
    }
  }

  function closeAdminLogin() {
    const layer = $('admin-login');
    if (layer) layer.classList.add('hidden');
  }

  async function adminLogin(password) {
    const error = $('admin-login-error');
    const button = $('admin-login-submit');
    if (error) {
      error.textContent = '';
      error.classList.add('hidden');
    }
    if (!String(password || '').trim()) {
      if (error) {
        error.textContent = 'Введите пароль';
        error.classList.remove('hidden');
      }
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = 'Проверка…';
    }
    try {
      const data = await adminRequest('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: String(password) }),
      });
      state.admin.token = data.token || '';
      closeAdminLogin();
      openAdminPanel();
      toast('Доступ к панели разрешён');
    } catch (err) {
      if (error) {
        error.textContent = err.message || 'Не удалось войти';
        error.classList.remove('hidden');
      }
      const input = $('admin-password');
      if (input) input.select();
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Войти';
      }
    }
  }

  function openAdminPanel() {
    const panel = $('admin-panel');
    if (!panel) return;
    closeAdminLogin();
    panel.classList.remove('hidden');
    document.body.classList.add('admin-open');
    if (!state.admin.state) renderAdminPanel();
    clearInterval(state.admin.timer);
    state.admin.timer = setInterval(() => {
      if (state.admin.token && !state.admin.loading && !state.admin.busy) loadAdminState(false);
    }, 15000);
    loadAdminState(!state.admin.state);
  }

  function closeAdminPanel() {
    const panel = $('admin-panel');
    if (panel) panel.classList.add('hidden');
    document.body.classList.remove('admin-open');
    clearInterval(state.admin.timer);
    state.admin.timer = null;
  }

  function adminLogout(silent = false) {
    state.admin.token = '';
    state.admin.state = null;
    state.admin.loading = false;
    state.admin.busy = false;
    closeAdminPanel();
    closeAdminLogin();
    if (!silent) toast('Вы вышли из панели администратора');
  }

  async function loadAdminState(showLoading) {
    if (!state.admin.token || state.admin.loading) return;
    state.admin.loading = true;
    if (showLoading) renderAdminPanel();
    try {
      const data = await adminRequest('/api/admin/state');
      state.admin.state = data;
      state.admin.error = '';
    } catch (err) {
      state.admin.error = err.message || 'Не удалось загрузить данные';
      if (!state.admin.token) return;
    } finally {
      state.admin.loading = false;
    }
    renderAdminPanel();
  }

  function adminDate(ts) {
    const value = Number(ts) || 0;
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return '—';
    }
  }

  function adminEsc(value) {
    return escapeHtml(String(value == null ? '' : value));
  }

  function adminAttr(value) {
    return escapeAttr(String(value == null ? '' : value));
  }

  function renderAdminPanel() {
    const body = $('admin-body');
    const subtitle = $('admin-subtitle');
    if (!body) return;
    if (subtitle) {
      subtitle.textContent = state.admin.state
        ? `Сервер ${adminBaseUrl()} · данные на ${adminDate(Date.now())}`
        : 'Управление сервером';
    }
    if (state.admin.error && !state.admin.state) {
      body.innerHTML = `<section class="admin-card admin-error-card">
        <h2>Не удалось загрузить панель</h2>
        <p>${adminEsc(state.admin.error)}</p>
        <button class="admin-btn accent" type="button" data-action="admin-refresh">${icon('refresh')}<span>Повторить</span></button>
      </section>`;
      return;
    }
    if (!state.admin.state) {
      body.innerHTML = `<div class="admin-loading"><span class="spinner"></span><span>Загрузка данных сервера…</span></div>`;
      return;
    }
    const data = state.admin.state;
    const stats = data.stats || {};
    const users = Array.isArray(data.users) ? data.users : [];
    const bans = data.bans || { devices: [], ips: [] };
    const notice = data.notice;
    const bansHtml = [
      ...(Array.isArray(bans.devices) ? bans.devices.map((item) => ({ ...item, kind: 'device' })) : []),
      ...(Array.isArray(bans.ips) ? bans.ips.map((item) => ({ ...item, kind: 'ip' })) : []),
    ].map((item) => `<div class="admin-ban-row">
      <span class="admin-tag ${item.kind === 'ip' ? 'accent' : ''}">${item.kind === 'ip' ? 'IP' : 'Устройство'}</span>
      <code class="admin-code">${adminEsc(item.value)}</code>
      <span class="admin-ban-reason">${adminEsc(item.reason || 'без причины')}</span>
      <span class="admin-muted">${adminEsc(adminDate(item.createdAt))}</span>
      <button class="admin-mini" type="button" data-action="admin-unban" data-kind="${item.kind}" data-value="${adminAttr(item.value)}">Разбанить</button>
    </div>`).join('');

    const usersHtml = users.map((user) => {
      const name = user.creator
        ? `${CREATOR_PREFIX} ${cleanDisplayName(user.displayName || user.nickname) || 'Без имени'}`
        : (cleanDisplayName(user.displayName || user.nickname) || 'Без имени');
      return `<div class="admin-user${user.online ? ' online' : ''}">
        <div class="admin-user-main">
          <div class="admin-user-name">
            <span class="${user.creator ? 'creator' : ''}">${adminEsc(name)}</span>
            ${user.online ? '<span class="admin-pill success">онлайн</span>' : '<span class="admin-pill">офлайн</span>'}
            ${user.creator ? '<span class="admin-pill gold">создатель</span>' : ''}
          </div>
          <div class="admin-user-meta">ID: <code class="admin-code">${adminEsc(user.id)}</code></div>
          <div class="admin-user-meta">Устройство: <code class="admin-code">${adminEsc(user.deviceId || '—')}</code>${user.deviceBanned ? ' <span class="admin-pill danger">забанено</span>' : ''}</div>
          <div class="admin-user-meta">IP: <code class="admin-code">${adminEsc(user.lastIp || '—')}</code>${user.ipBanned ? ' <span class="admin-pill danger">забанен</span>' : ''}</div>
          <div class="admin-user-meta admin-muted">Последний вход: ${adminEsc(adminDate(user.lastSeenAt))} · регистрация: ${adminEsc(adminDate(user.createdAt))}${user.model ? ` · ${adminEsc(user.model)}` : ''}</div>
        </div>
        <div class="admin-user-actions">
          <button class="admin-mini" type="button" data-action="admin-ban-device" data-value="${adminAttr(user.deviceId || '')}" data-name="${adminAttr(name)}"${user.deviceBanned || !user.deviceId ? ' disabled' : ''}>${user.deviceBanned ? 'Устройство забанено' : 'Бан устройства'}</button>
          <button class="admin-mini" type="button" data-action="admin-ban-ip" data-value="${adminAttr(user.lastIp || '')}" data-name="${adminAttr(name)}"${user.ipBanned || !user.lastIp ? ' disabled' : ''}>${user.ipBanned ? 'IP забанен' : 'Бан IP'}</button>
          <button class="admin-mini" type="button" data-action="admin-kick" data-value="${adminAttr(user.id)}" data-name="${adminAttr(name)}"${user.online ? '' : ' disabled'}>Кик</button>
          <button class="admin-mini danger" type="button" data-action="admin-delete-user" data-value="${adminAttr(user.id)}" data-name="${adminAttr(name)}">Удалить аккаунт</button>
        </div>
      </div>`;
    }).join('');

    const noticeHtml = notice
      ? `<div class="admin-current-notice">
          <div>
            <strong>${adminEsc(notice.title || 'Уведомление')}</strong>
            <span class="admin-pill accent">${adminEsc(notice.version || 'без версии')}</span>
            <p>${adminEsc(notice.text || 'Без текста')}</p>
            <p class="admin-muted">${adminEsc(adminDate(notice.createdAt))}${notice.url ? ` · ${adminEsc(notice.url)}` : ''}</p>
          </div>
          <button class="admin-mini danger" type="button" data-action="admin-notice-clear">Снять</button>
        </div>`
      : '<p class="admin-hint">Активного уведомления нет.</p>';

    body.innerHTML = `
      <div class="admin-stats">
        <article class="admin-stat"><span class="admin-stat-label">Пользователи</span><strong>${Number(stats.users) || 0}</strong></article>
        <article class="admin-stat"><span class="admin-stat-label">Онлайн</span><strong>${Number(stats.online) || 0}</strong></article>
        <article class="admin-stat"><span class="admin-stat-label">Сообщения</span><strong>${Number(stats.messages) || 0}</strong></article>
        <article class="admin-stat"><span class="admin-stat-label">В общем чате</span><strong>${Number(stats.lobbyMessages) || 0}</strong></article>
      </div>

      <section class="admin-card">
        <div class="admin-card-head"><h2>Быстрые действия</h2><span class="admin-muted">Сервер ${adminEsc(adminBaseUrl())}</span></div>
        <div class="admin-actions-row">
          <button class="admin-btn danger" type="button" data-action="admin-clear-lobby">${icon('trash')}<span>Очистить общий чат</span></button>
          <button class="admin-btn" type="button" data-action="admin-refresh">${icon('refresh')}<span>Обновить данные</span></button>
        </div>
        <p class="admin-hint">Очистка общего чата удаляет все сообщения лобби у всех пользователей. Личные переписки не затрагиваются.</p>
      </section>

      <section class="admin-card">
        <div class="admin-card-head"><h2>Уведомление об обновлении</h2></div>
        ${noticeHtml}
        <form class="admin-form" id="admin-notice-form" autocomplete="off">
          <div class="admin-form-grid">
            <label class="admin-field"><span>Заголовок</span><input id="admin-notice-title" type="text" maxlength="120" placeholder="Доступно обновление UltraChat"></label>
            <label class="admin-field"><span>Версия</span><input id="admin-notice-version" type="text" maxlength="32" placeholder="1.7.2"></label>
          </div>
          <label class="admin-field"><span>Текст уведомления</span><textarea id="admin-notice-text" rows="3" maxlength="1000" placeholder="Установите новую версию приложения"></textarea></label>
          <label class="admin-field"><span>Ссылка на APK или страницу</span><input id="admin-notice-url" type="text" maxlength="500" placeholder="/download/UltraChat.apk"></label>
          <button class="admin-btn accent" type="submit">${icon('megaphone')}<span>Отправить всем</span></button>
        </form>
      </section>

      <section class="admin-card">
        <div class="admin-card-head"><h2>Баны</h2><span class="admin-muted">${(bans.devices || []).length + (bans.ips || []).length} записей</span></div>
        <form class="admin-form" id="admin-ban-form" autocomplete="off">
          <div class="admin-form-grid ban-grid">
            <label class="admin-field"><span>Тип</span><select id="admin-ban-kind"><option value="device">ID устройства</option><option value="ip">IP-адрес</option></select></label>
            <label class="admin-field"><span>Значение</span><input id="admin-ban-value" type="text" maxlength="96" placeholder="web-... или 203.0.113.5"></label>
            <label class="admin-field"><span>Причина</span><input id="admin-ban-reason" type="text" maxlength="200" placeholder="Нарушение правил"></label>
          </div>
          <button class="admin-btn danger" type="submit">${icon('ban')}<span>Забанить</span></button>
        </form>
        <div class="admin-bans">
          ${bansHtml || '<p class="admin-hint">Активных банов нет.</p>'}
        </div>
      </section>

      <section class="admin-card">
        <div class="admin-card-head"><h2>Пользователи</h2><span class="admin-muted">${users.length} shown</span></div>
        <div class="admin-users">${usersHtml || '<p class="admin-hint">Пользователей пока нет.</p>'}</div>
      </section>`;
  }

  function adminSetBusy(busy) {
    state.admin.busy = busy;
  }

  async function adminClearLobby() {
    if (state.admin.busy) return;
    adminSetBusy(true);
    try {
      const data = await adminRequest('/api/admin/lobby/clear', { method: 'POST' });
      toast(`Общий чат очищен: ${Number(data.removed) || 0} сообщений`);
      await loadAdminState(false);
    } catch (err) {
      toast(err.message || 'Не удалось очистить общий чат', { error: true });
    } finally {
      adminSetBusy(false);
    }
  }

  function confirmAdminClearLobby() {
    openDialog({
      icon: 'trash',
      title: 'Очистить общий чат?',
      body: '<div class="dialog-copy">Все сообщения общего чата будут удалены у всех пользователей. Это действие нельзя отменить.</div>',
      confirmText: 'Очистить',
      danger: true,
      onConfirm: () => {
        adminClearLobby();
        return true;
      },
    });
  }

  async function adminBan(kind, value, reason) {
    if (state.admin.busy) return;
    adminSetBusy(true);
    try {
      await adminRequest('/api/admin/ban', {
        method: 'POST',
        body: JSON.stringify({ kind, value, reason: reason || '' }),
      });
      toast(kind === 'ip' ? 'IP-адрес забанен' : 'Устройство забанено');
      await loadAdminState(false);
    } catch (err) {
      toast(err.message || 'Не удалось забанить', { error: true });
    } finally {
      adminSetBusy(false);
    }
  }

  function confirmAdminBan(kind, value, name) {
    if (!value) return;
    const target = kind === 'ip' ? `IP ${value}` : `устройство «${name || value}»`;
    openDialog({
      icon: 'ban',
      title: 'Заблокировать доступ?',
      body: `<div class="dialog-copy">${escapeHtml(target)} будет отключён от сервера и не сможет войти снова.</div>`,
      confirmText: 'Забанить',
      danger: true,
      onConfirm: () => {
        adminBan(kind, value, 'Заблокирован через панель');
        return true;
      },
    });
  }

  async function adminDeleteUser(userId, name) {
    if (state.admin.busy || !userId) return;
    adminSetBusy(true);
    try {
      const data = await adminRequest('/api/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      toast(`Аккаунт ${name || userId} удалён, сообщений: ${Number(data.removedMessages) || 0}`);
      await loadAdminState(false);
    } catch (err) {
      toast(err.message || 'Не удалось удалить аккаунт', { error: true });
    } finally {
      adminSetBusy(false);
    }
  }

  function confirmAdminDeleteUser(userId, name) {
    if (!userId) return;
    openDialog({
      icon: 'trash',
      title: 'Удалить аккаунт?',
      body: `<div class="dialog-copy">Аккаунт «${escapeHtml(name || userId)}» и все его сообщения будут удалены безвозвратно. Пользователя сразу выкинет, и он сможет зарегистрироваться заново.</div>`,
      confirmText: 'Удалить аккаунт',
      danger: true,
      onConfirm: () => {
        adminDeleteUser(userId, name);
        return true;
      },
    });
  }

  async function adminUnban(kind, value) {
    if (state.admin.busy || !value) return;
    adminSetBusy(true);
    try {
      await adminRequest('/api/admin/unban', {
        method: 'POST',
        body: JSON.stringify({ kind, value }),
      });
      toast('Бан снят');
      await loadAdminState(false);
    } catch (err) {
      toast(err.message || 'Не удалось снять бан', { error: true });
    } finally {
      adminSetBusy(false);
    }
  }

  async function adminKick(userId, name) {
    if (state.admin.busy || !userId) return;
    adminSetBusy(true);
    try {
      const data = await adminRequest('/api/admin/kick', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      toast(`Кик ${name || userId}: ${Number(data.kicked) || 0} сеансов`);
      await loadAdminState(false);
    } catch (err) {
      toast(err.message || 'Не удалось отключить пользователя', { error: true });
    } finally {
      adminSetBusy(false);
    }
  }

  async function adminSendNotice() {
    if (state.admin.busy) return;
    const title = $('admin-notice-title');
    const text = $('admin-notice-text');
    const version = $('admin-notice-version');
    const url = $('admin-notice-url');
    if (!title || !text) return;
    if (!title.value.trim() && !text.value.trim()) {
      toast('Заполните заголовок или текст уведомления', { error: true });
      return;
    }
    adminSetBusy(true);
    try {
      const data = await adminRequest('/api/admin/notice', {
        method: 'POST',
        body: JSON.stringify({
          title: title.value.trim(),
          text: text.value.trim(),
          version: version ? version.value.trim() : '',
          url: url ? url.value.trim() : '',
        }),
      });
      if (state.admin.state) state.admin.state.notice = data.notice;
      renderAdminPanel();
      toast('Уведомление отправлено всем пользователям');
    } catch (err) {
      toast(err.message || 'Не удалось отправить уведомление', { error: true });
    } finally {
      adminSetBusy(false);
    }
  }

  async function adminClearNotice() {
    if (state.admin.busy) return;
    adminSetBusy(true);
    try {
      await adminRequest('/api/admin/notice/clear', { method: 'POST' });
      if (state.admin.state) state.admin.state.notice = null;
      renderAdminPanel();
      toast('Уведомление снято');
    } catch (err) {
      toast(err.message || 'Не удалось снять уведомление', { error: true });
    } finally {
      adminSetBusy(false);
    }
  }

  function handleAdminSubmit(form) {
    if (!form || !form.id) return false;
    if (form.id === 'admin-login-form') {
      const input = $('admin-password');
      adminLogin(input ? input.value : '');
      return true;
    }
    if (form.id === 'admin-ban-form') {
      const kind = $('admin-ban-kind');
      const value = $('admin-ban-value');
      const reason = $('admin-ban-reason');
      if (!value || !value.value.trim()) {
        toast('Укажите ID устройства или IP-адрес', { error: true });
        return true;
      }
      adminBan(kind ? kind.value : 'device', value.value.trim(), reason ? reason.value.trim() : '');
      return true;
    }
    if (form.id === 'admin-notice-form') {
      adminSendNotice();
      return true;
    }
    return false;
  }

  function handleDocumentSubmit(event) {
    const form = event.target;
    if (!form || form.tagName !== 'FORM') return;
    if (handleAdminSubmit(form)) event.preventDefault();
  }

  function handleSettingsTap(open) {
    const now = Date.now();
    if (!state.adminTap.at || now - state.adminTap.at > ADMIN_TAP_WINDOW_MS) {
      state.adminTap = { count: 1, at: now };
    } else {
      state.adminTap.count += 1;
      state.adminTap.at = now;
    }
    if (state.adminTap.count >= ADMIN_TAPS) {
      state.adminTap = { count: 0, at: 0 };
      openAdminLogin();
      return true;
    }
    if (typeof open === 'function') open();
    return false;
  }

  // ------------------------------------------------------------------
  // Event wiring
  // ------------------------------------------------------------------

  const TOGGLE_KEYS = new Set([
    'showTimestamps',
    'haptics',
    'keepScreenOn',
    'showLinkBanners',
    'autoScan',
    'autoReconnect',
    'animations',
  ]);

  function isVisible(node) {
    return !!node && !node.classList.contains('hidden');
  }

  function handleAction(element) {
    const action = element.dataset.action || '';
    const value = element.dataset.value || '';
    switch (action) {
      case 'signup-avatar':
        selectSignupAvatar(element.dataset.id);
        break;
      case 'signup-mode':
        setSignupMode(value === 'photo' ? 'photo' : 'emoji');
        break;
      case 'signup-photo-pick':
        pickPhoto('signup');
        break;
      case 'signup-photo-remove':
        state.signup.photo = null;
        state.signup.mode = 'photo';
        renderOnboarding();
        break;
      case 'secret-tap':
        handleSecretTap(element.dataset.context === 'profile' ? 'profile' : 'signup');
        break;
      case 'open-add':
        openAddContact();
        break;
      case 'theme':
        if (THEMES[value]) applySetting('theme', value);
        break;
      case 'accent':
        if (ACCENTS[value]) applySetting('accent', value);
        break;
      case 'wallpaper':
        if (WALLPAPERS.some((item) => item.id === value)) applySetting('wallpaper', value);
        break;
      case 'font':
        if (FONT_SIZES[value]) applySetting('fontSize', value);
        break;
      case 'bubble':
        if (BUBBLES[value]) applySetting('bubbleStyle', value);
        break;
      case 'density':
        if (DENSITIES[value]) applySetting('density', value);
        break;
      case 'toggle': {
        const key = element.dataset.key || '';
        if (TOGGLE_KEYS.has(key)) applySetting(key, !state.settings[key]);
        break;
      }
      case 'settings-close':
        closeSettings();
        break;
      case 'chat-delete':
        confirmDeleteChat();
        break;
      case 'message-menu':
        openMessageMenu(element.dataset.id || '');
        break;
      case 'message-edit':
        closeDialog(true);
        openEditMessageDialog(element.dataset.id || '');
        break;
      case 'message-delete':
        closeDialog(true);
        confirmDeleteMessage(element.dataset.id || '');
        break;
      case 'admin-refresh':
        loadAdminState(true);
        break;
      case 'admin-close':
        closeAdminPanel();
        break;
      case 'admin-logout':
        adminLogout();
        break;
      case 'admin-clear-lobby':
        confirmAdminClearLobby();
        break;
      case 'admin-ban-device':
        confirmAdminBan('device', element.dataset.value || '', element.dataset.name || '');
        break;
      case 'admin-ban-ip':
        confirmAdminBan('ip', element.dataset.value || '', element.dataset.name || '');
        break;
      case 'admin-unban':
        adminUnban(element.dataset.kind === 'ip' ? 'ip' : 'device', element.dataset.value || '');
        break;
      case 'admin-kick':
        adminKick(element.dataset.value || '', element.dataset.name || '');
        break;
      case 'admin-delete-user':
        confirmAdminDeleteUser(element.dataset.value || '', element.dataset.name || '');
        break;
      case 'admin-notice-clear':
        adminClearNotice();
        break;
      case 'save-server':
        saveServerSettings();
        break;
      case 'check-server':
        checkServerConnection();
        break;
      case 'reset-settings':
        confirmResetSettings();
        break;
      case 'clear-history':
        confirmClearHistory();
        break;
      case 'delete-account':
        confirmDeleteAccount();
        break;
      case 'profile-avatar': {
        if (!state.profileDraft) break;
        const id = element.dataset.id;
        state.profileDraft.avatarId = normalizeAvatar(id);
        state.profileDraft.photo = null;
        state.profileError = '';
        haptic();
        renderProfile();
        break;
      }
      case 'profile-photo-pick':
        pickPhoto('profile');
        break;
      case 'profile-photo-remove':
        removeProfilePhoto();
        break;
      case 'profile-close':
        closeProfile();
        break;
      case 'profile-save':
        saveProfileDraft();
        break;
      case 'add-contact':
        addContact(element.dataset.id);
        break;
      default:
        break;
    }
  }

  function handleDocumentClick(event) {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    const actionElement = target.closest('[data-action]');
    if (actionElement && actionElement.tagName !== 'INPUT' && !actionElement.disabled) {
      handleAction(actionElement);
      return;
    }
    const thread = target.closest('.thread[data-peer]');
    if (thread && thread.dataset.peer) {
      openChat(thread.dataset.peer);
      return;
    }
    const photo = target.closest('#messages .chat-photo');
    if (photo && photo.getAttribute('src')) {
      openLightbox(photo.getAttribute('src'));
    }
  }

  function handleDocumentInput(event) {
    const target = event.target;
    if (!target || !target.id && !target.matches) return;
    if (target.id === 'signup-nickname') {
      updateSignupPraise();
      return;
    }
    if (target.id === 'contact-search') {
      onContactSearchInput();
      return;
    }
    if (target.id === 'profile-nickname') {
      handleProfileInput(event);
      return;
    }
    if (target.id === 'server-url-input') {
      state.serverDraft.url = target.value;
      state.serverSaved = target.value.trim() === state.settings.serverUrl &&
        state.serverDraft.token === state.settings.serverToken;
      updateServerUrlHint();
      updateServerSavedNote(state.serverSaved);
      return;
    }
    if (target.id === 'server-token-input') {
      state.serverDraft.token = target.value;
      state.serverSaved = target.value.trim() === state.settings.serverToken &&
        state.serverDraft.url.trim() === state.settings.serverUrl;
      updateServerSavedNote(state.serverSaved);
      return;
    }
    if (target.id === 'message-input') {
      handleComposerInput();
      return;
    }
    if (target.id === 'creator-code') {
      target.value = target.value.replace(/\D/g, '').slice(0, 8);
      const error = $('creator-code-error');
      if (error) error.classList.add('hidden');
      const field = target.closest('.field');
      if (field) field.style.borderColor = '';
      return;
    }
    if (target.matches && target.matches('input[data-action="dim"]')) {
      handleDimInput(target);
    }
  }

  function handleComposerInput() {
    const input = $('message-input');
    if (!input) return;
    if (state.activePeerId) state.drafts.set(state.activePeerId, input.value);
    autoGrowInput();
    updateSendState();
    if (!state.connected || !state.activePeerId) return;
    if (isLobby(state.activePeerId)) return;
    if (!input.value.trim()) return;
    const now = Date.now();
    if (now - state.typingSentAt < 2400) return;
    state.typingSentAt = now;
    sendFrame({ type: 'typing', to: state.activePeerId });
  }

  function handleDimInput(input) {
    const value = clamp((Number(input.value) || 0) / 100, 0, 0.8);
    state.settings.wallpaperDim = value;
    saveSettings();
    applySettings();
    const label = $('dim-value');
    if (label) label.textContent = `${Math.round(value * 100)}%`;
  }

  function closeTopLayer() {
    if (isVisible($('lightbox'))) {
      closeLightbox();
      return true;
    }
    if (isVisible($('dialog-root'))) {
      closeDialog(true);
      return true;
    }
    if (isVisible($('add-contact-modal'))) {
      closeAddContact();
      return true;
    }
    if (isVisible($('admin-login'))) {
      closeAdminLogin();
      return true;
    }
    if (isVisible($('admin-panel'))) {
      closeAdminPanel();
      return true;
    }
    if (state.screen === 'settings') {
      closeSettings();
      return true;
    }
    if (state.screen === 'profile') {
      closeProfile();
      return true;
    }
    if (state.screen === 'chat' && window.innerWidth < 900) {
      closeChat();
      return true;
    }
    return false;
  }

  function handleDocumentKeyDown(event) {
    const target = event.target;
    if (event.key === 'Escape') {
      if (closeTopLayer()) event.preventDefault();
      return;
    }
    if (event.key !== 'Enter' || event.isComposing || event.shiftKey) return;
    if (!target || typeof target.closest !== 'function') return;
    if (target.id === 'message-input') {
      event.preventDefault();
      submitMessage();
      return;
    }
    if (target.id === 'signup-nickname') {
      event.preventDefault();
      advanceOnboarding();
      return;
    }
    if (target.id === 'contact-search') {
      event.preventDefault();
      const query = state.search.query.trim();
      if (state.search.users.length === 1) {
        addContact(state.search.users[0].id);
      } else if (query.length >= 2) {
        searchUsers(query);
      }
      return;
    }
    if (target.id === 'server-url-input') {
      event.preventDefault();
      saveServerSettings();
      return;
    }
    if (target.id === 'creator-code') {
      event.preventDefault();
      confirmDialogAction();
    }
  }

  function on(id, type, handler) {
    const node = $(id);
    if (node) node.addEventListener(type, handler);
  }

  function bindEvents() {
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('input', handleDocumentInput);
    document.addEventListener('keydown', handleDocumentKeyDown);
    document.addEventListener('submit', handleDocumentSubmit);

    on('signup-next', 'click', advanceOnboarding);
    on('onboard-settings', 'click', () => handleSettingsTap(() => openSettings(true)));
    on('onboard-logo', 'click', () => handleSecretTap('signup'));
    on('me-button', 'click', openProfile);
    on('add-contact-btn', 'click', openAddContact);
    on('empty-add', 'click', openAddContact);
    on('open-settings', 'click', () => handleSettingsTap(() => openSettings()));
    on('chat-settings', 'click', () => handleSettingsTap(() => openSettings()));
    on('chat-delete', 'click', confirmDeleteChat);
    on('chat-back', 'click', closeChat);
    on('notice-close', 'click', dismissNotice);
    on('admin-login-close', 'click', closeAdminLogin);
    on('chat-banner-close', 'click', () => {
      state.bannerDismissed = true;
      renderChatHeader();
    });
    on('attach-btn', 'click', pickChatPhoto);
    on('contact-close', 'click', closeAddContact);
    on('lightbox-close', 'click', closeLightbox);

    on('composer', 'submit', (event) => {
      event.preventDefault();
      submitMessage();
    });

    on('avatar-file', 'change', (event) => {
      const input = event.target;
      const file = input.files && input.files[0];
      input.value = '';
      handleAvatarFile(file);
    });
    on('photo-file', 'change', (event) => {
      const input = event.target;
      const file = input.files && input.files[0];
      input.value = '';
      handleChatPhotoFile(file);
    });

    const modal = $('add-contact-modal');
    if (modal) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) closeAddContact();
      });
    }

    const dialogRoot = $('dialog-root');
    if (dialogRoot) {
      dialogRoot.addEventListener('click', (event) => {
        const target = event.target;
        if (!target || typeof target.closest !== 'function') return;
        if (target.closest('[data-dialog-confirm]')) {
          confirmDialogAction();
          return;
        }
        if (target.closest('[data-dialog-cancel]')) {
          closeDialog(true);
          return;
        }
        if (target === dialogRoot) closeDialog(true);
      });
    }

    const lightbox = $('lightbox');
    if (lightbox) {
      lightbox.addEventListener('click', (event) => {
        if (event.target === lightbox) closeLightbox();
      });
    }

    window.addEventListener('resize', () => {
      if (state.booted) setScreen(state.screen);
    });

    window.addEventListener('online', () => {
      if (!state.token || !state.me) return;
      if (!state.connected && !state.connecting && state.settings.autoReconnect) connect();
    });

    window.addEventListener('focus', () => {
      markChatRead(state.activePeerId);
    });

    window.addEventListener('offline', () => {
      clearTimeout(state.reconnectTimer);
      if (!state.connected) {
        state.lastConnectionError = 'Нет интернета';
        renderConnectionStatus();
      }
    });

    document.addEventListener('visibilitychange', () => {
      updateWakeLock();
      if (document.visibilityState === 'visible') markChatRead(state.activePeerId);
    });

    window.addEventListener('beforeunload', () => {
      const ws = state.ws;
      if (!ws) return;
      try {
        ws.close(1000, 'page unload');
      } catch {
        /* ignore */
      }
    });
  }

  // ------------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------------

  function restoreThreads() {
    const stored = loadStoredThreads();
    for (const item of stored) {
      if (!item || typeof item.id !== 'string' || !item.id) continue;
      state.threads.set(item.id, {
        id: item.id,
        title: String(item.title || 'Собеседник'),
        creator: item.creator === true,
        avatarId: normalizeAvatar(item.avatarId),
        lastText: String(item.lastText || ''),
        lastTs: Number(item.lastTs) || 0,
        lastIsMine: item.lastIsMine === true,
        count: Math.max(0, Number(item.count) || 0),
        online: false,
      });
    }
  }

  function seedSignupFromProfile() {
    if (!state.me) return;
    state.signup = {
      nickname: state.me.nickname,
      avatarId: normalizeAvatar(state.me.avatarId),
      photo: state.me.photo || null,
      creator: state.me.creator === true,
      mode: state.me.photo ? 'photo' : 'emoji',
    };
  }

  function init() {
    state.settings = loadSettings();
    state.me = loadProfile();
    try {
      state.token = localStorage.getItem(STORAGE.token) || '';
    } catch {
      state.token = '';
    }
    state.deviceId = ensureDeviceId();
    restoreThreads();
    applySettings();
    bindEvents();

    if (state.me && state.token) {
      seedSignupFromProfile();
      showShell();
      setScreen('empty');
      connect();
    } else {
      if (state.me) {
        seedSignupFromProfile();
        state.onboardingStep = 1;
      } else {
        state.onboardingStep = 0;
      }
      renderOnboarding();
    }

    state.booted = true;
  }

  init();
})();
