const STORAGE_KEY = 'countdown-tool-v1';
const FALLBACK_YEARS = 2;

const form = document.getElementById('countdownForm');
const labelInput = document.getElementById('labelInput');
const dateTimeInput = document.getElementById('dateTimeInput');
const notesInput = document.getElementById('notesInput');
const clearButton = document.getElementById('clearButton');
const exportButton = document.getElementById('exportButton');
const importInput = document.getElementById('importInput');
const installButton = document.getElementById('installButton');

const countdownLabel = document.getElementById('countdownLabel');
const countdownTarget = document.getElementById('countdownTarget');
const countdownStatus = document.getElementById('countdownStatus');
const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');

let deferredInstallPrompt = null;
let state = loadState();

hydrateForm();
render();
setInterval(render, 1000);
registerServiceWorker();
setupInstallPrompt();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const targetAt = dateTimeInput.value;
  if (!targetAt) return;

  state = {
    version: 1,
    label: labelInput.value.trim(),
    notes: notesInput.value.trim(),
    targetAt,
    createdAt: state.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    keepUntil: state.keepUntil || addYearsIso(new Date(), FALLBACK_YEARS),
  };

  persistState();
  render();
});

clearButton.addEventListener('click', () => {
  state = createEmptyState();
  persistState();
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
  const text = await file.text();
  const imported = JSON.parse(text);
  state = normalizeState(imported);
  persistState();
  hydrateForm();
  render();
  event.target.value = '';
});

function createEmptyState() {
  return {
    version: 1,
    label: '',
    notes: '',
    targetAt: '',
    createdAt: null,
    updatedAt: null,
    keepUntil: addYearsIso(new Date(), FALLBACK_YEARS),
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
    keepUntil: typeof raw?.keepUntil === 'string' ? raw.keepUntil : addYearsIso(new Date(), FALLBACK_YEARS),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
  dateTimeInput.value = state.targetAt || '';
  notesInput.value = state.notes || '';
}

function render() {
  if (!state.targetAt) {
    countdownLabel.textContent = 'No countdown selected';
    countdownTarget.textContent = 'Set a date and time';
    countdownStatus.textContent = 'This device stores its own countdown locally for long-term persistence.';
    updateClock(0, 0, 0, 0);
    return;
  }

  const targetDate = new Date(state.targetAt);
  if (Number.isNaN(targetDate.getTime())) {
    countdownStatus.textContent = 'Saved date is invalid. Please update it.';
    updateClock(0, 0, 0, 0);
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
  updateClock(days, hours, minutes, seconds);

  if (diffMs <= 0) {
    countdownStatus.textContent = state.notes
      ? `Time reached. ${state.notes}`
      : 'Time reached.';
  } else {
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

function addYearsIso(date, years) {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + years);
  return copy.toISOString();
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
