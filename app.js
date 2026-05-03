const STORAGE_KEY = 'countdown-tool-v2';
const FALLBACK_YEARS = 2;
const APP_NAME = 'Countdown (Obsolete)';

const form = document.getElementById('countdownForm');
const labelInput = document.getElementById('labelInput');
const dateTimeInput = document.getElementById('dateTimeInput');
const notesInput = document.getElementById('notesInput');
const notifyInput = document.getElementById('notifyInput');
const clearButton = document.getElementById('clearButton');
const exportButton = document.getElementById('exportButton');
const importInput = document.getElementById('importInput');
const installButton = document.getElementById('installButton');
const widgetButton = document.getElementById('widgetButton');
const copyWidgetLinkButton = document.getElementById('copyWidgetLinkButton');
const menuButton = document.getElementById('menuButton');
const closeMenuButton = document.getElementById('closeMenuButton');
const helpDrawer = document.getElementById('helpDrawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');

const countdownLabel = document.getElementById('countdownLabel');
const countdownTarget = document.getElementById('countdownTarget');
const countdownMeta = document.getElementById('countdownMeta');
const countdownNotes = document.getElementById('countdownNotes');
const countdownStatus = document.getElementById('countdownStatus');
const progressBar = document.getElementById('progressBar');
const daysEl = document.getElementById('days');
const daysLargeEl = document.getElementById('daysLarge');
const daysLargeLabelEl = document.getElementById('daysLargeLabel');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');

let deferredInstallPrompt = null;
let completionNotificationSent = false;
let state = loadState();
const isWidgetMode = new URLSearchParams(window.location.search).get('view') === 'widget';

if (isWidgetMode) {
  document.body.classList.add('widget-mode');
}

prepareDateInput();
hydrateForm();
render();
setInterval(render, 1000);
registerServiceWorker();
setupInstallPrompt();
setupWidgetActions();
setupHelpDrawer();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const targetAt = dateTimeInput.value;
  if (!targetAt) return;

  state = {
    version: 2,
    label: labelInput.value.trim(),
    notes: notesInput.value.trim(),
    notifyOnFinish: Boolean(notifyInput.checked),
    targetAt,
    createdAt: state.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    keepUntil: state.keepUntil || addYearsIso(new Date(), FALLBACK_YEARS),
    completedNotifiedAt: null,
  };

  persistState();
  completionNotificationSent = false;

  if (state.notifyOnFinish && 'Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      // ignore permission errors
    }
  }

  render();
});

clearButton.addEventListener('click', () => {
  state = createEmptyState();
  persistState();
  completionNotificationSent = false;
  prepareDateInput();
  hydrateForm();
  render();
});

exportButton.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'countdown-backup.json';
  link.click();
  URL.revokeObjectURL(url);
});

importInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    state = normalizeState(imported);
    persistState();
    completionNotificationSent = false;
    hydrateForm();
    render();
    countdownStatus.textContent = 'Backup imported successfully.';
  } catch {
    countdownStatus.textContent = 'That backup file could not be imported. Please choose a valid JSON export.';
  }

  event.target.value = '';
});

function createEmptyState() {
  return {
    version: 2,
    label: '',
    notes: '',
    notifyOnFinish: false,
    targetAt: '',
    createdAt: null,
    updatedAt: null,
    keepUntil: addYearsIso(new Date(), FALLBACK_YEARS),
    completedNotifiedAt: null,
  };
}

function normalizeState(raw) {
  const base = createEmptyState();
  return {
    ...base,
    ...raw,
    label: typeof raw?.label === 'string' ? raw.label : '',
    notes: typeof raw?.notes === 'string' ? raw.notes : '',
    targetAt: typeof raw?.targetAt === 'string' ? raw.targetAt : '',
    notifyOnFinish: Boolean(raw?.notifyOnFinish),
    keepUntil: typeof raw?.keepUntil === 'string' ? raw.keepUntil : addYearsIso(new Date(), FALLBACK_YEARS),
    completedNotifiedAt: typeof raw?.completedNotifiedAt === 'string' ? raw.completedNotifiedAt : null,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('countdown-tool-v1');
    if (!raw) return createEmptyState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return createEmptyState();
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hydrateForm() {
  labelInput.value = state.label || '';
  dateTimeInput.value = state.targetAt || dateTimeInput.value || '';
  notesInput.value = state.notes || '';
  notifyInput.checked = Boolean(state.notifyOnFinish);
}

function prepareDateInput() {
  const now = new Date();
  dateTimeInput.min = toLocalInputValue(now);
  if (!state.targetAt) {
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    dateTimeInput.value = toLocalInputValue(nextHour);
  }
}

function render() {
  if (!state.targetAt) {
    countdownLabel.textContent = 'No countdown selected';
    countdownTarget.textContent = 'Set a date and time';
    countdownMeta.textContent = 'Your local timezone will be used for this device.';
    countdownStatus.textContent = 'This device stores its own countdown locally for long-term persistence.';
    countdownNotes.classList.add('hidden');
    updateClock(0, 0, 0, 0);
    updateDayFocus(0, 'days left');
    updateProgress(0);
    document.title = APP_NAME;
    return;
  }

  const targetDate = new Date(state.targetAt);
  if (Number.isNaN(targetDate.getTime())) {
    countdownStatus.textContent = 'Saved date is invalid. Please update it.';
    countdownMeta.textContent = 'Your local timezone will be used for this device.';
    countdownNotes.classList.add('hidden');
    updateClock(0, 0, 0, 0);
    updateDayFocus(0, 'days left');
    updateProgress(0);
    document.title = APP_NAME;
    return;
  }

  const diffMs = targetDate.getTime() - Date.now();
  const clamped = Math.max(diffMs, 0);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  countdownLabel.textContent = state.label || 'Countdown';
  countdownTarget.textContent = targetDate.toLocaleString([], {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  countdownMeta.textContent = `Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;

  if (state.notes) {
    countdownNotes.textContent = state.notes;
    countdownNotes.classList.remove('hidden');
  } else {
    countdownNotes.classList.add('hidden');
  }

  updateClock(days, hours, minutes, seconds);
  updateProgress(computeProgress(targetDate));

  if (diffMs <= 0) {
    updateDayFocus(0, 'time reached');
    document.title = `${state.label || 'Countdown'} — reached [obsolete]`;
    countdownStatus.textContent = state.notes ? `Time reached. ${state.notes}` : 'Time reached.';
    maybeNotifyCompletion();
  } else {
    updateDayFocus(days, days === 1 ? 'day left' : 'days left');
    document.title = `${days}d left — ${state.label || 'Countdown'} [obsolete]`;
    const backupDate = new Date(state.keepUntil);
    countdownStatus.textContent = `Saved on this device. Backup retention target: ${backupDate.toLocaleDateString()}.`;
  }
}

function updateClock(days, hours, minutes, seconds) {
  daysEl.textContent = String(days);
  hoursEl.textContent = String(hours).padStart(2, '0');
  minutesEl.textContent = String(minutes).padStart(2, '0');
  secondsEl.textContent = String(seconds).padStart(2, '0');
}

function updateDayFocus(days, label) {
  daysLargeEl.textContent = String(days);
  daysLargeLabelEl.textContent = label;
}

function updateProgress(percent) {
  progressBar.style.width = `${percent}%`;
}

function computeProgress(targetDate) {
  if (!state.createdAt) return 0;
  const createdAt = new Date(state.createdAt);
  const total = targetDate.getTime() - createdAt.getTime();
  if (total <= 0) return 100;
  const elapsed = Date.now() - createdAt.getTime();
  const percent = Math.min(Math.max((elapsed / total) * 100, 0), 100);
  return Math.round(percent * 10) / 10;
}

function addYearsIso(date, years) {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + years);
  return copy.toISOString();
}

function toLocalInputValue(date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.classList.remove('hidden');
  });

  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.classList.add('hidden');
  });
}

function setupWidgetActions() {
  widgetButton.addEventListener('click', () => {
    const widgetUrl = new URL(window.location.href);
    widgetUrl.searchParams.set('view', 'widget');
    window.open(widgetUrl.toString(), '_blank', 'noopener,noreferrer');
  });

  copyWidgetLinkButton.addEventListener('click', async () => {
    const widgetUrl = new URL(window.location.href);
    widgetUrl.searchParams.set('view', 'widget');

    try {
      await navigator.clipboard.writeText(widgetUrl.toString());
      countdownStatus.textContent = 'Compact view link copied.';
    } catch {
      countdownStatus.textContent = `Compact view: ${widgetUrl.toString()}`;
    }
  });
}

function setupHelpDrawer() {
  if (!menuButton || !helpDrawer || !drawerBackdrop) return;

  const openDrawer = () => {
    helpDrawer.classList.remove('hidden');
    drawerBackdrop.classList.remove('hidden');
    helpDrawer.setAttribute('aria-hidden', 'false');
    menuButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
  };

  const closeDrawer = () => {
    helpDrawer.classList.add('hidden');
    drawerBackdrop.classList.add('hidden');
    helpDrawer.setAttribute('aria-hidden', 'true');
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  };

  menuButton.addEventListener('click', () => {
    if (helpDrawer.classList.contains('hidden')) {
      openDrawer();
    } else {
      closeDrawer();
    }
  });

  closeMenuButton?.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', closeDrawer);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeDrawer();
    }
  });
}

function maybeNotifyCompletion() {
  if (!state.notifyOnFinish || completionNotificationSent || state.completedNotifiedAt) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    new Notification(state.label || 'Countdown complete', {
      body: state.notes || 'Your countdown reached zero.',
      icon: 'icons/icon-192.png',
    });
    completionNotificationSent = true;
    state.completedNotifiedAt = new Date().toISOString();
    persistState();
  } catch {
    // ignore notification errors
  }
}
