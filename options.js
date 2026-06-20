const SETTINGS_KEY = 'settings';
const DEFAULT_DAYS = 30;

let selectedDays = DEFAULT_DAYS;

async function loadSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const settings = result[SETTINGS_KEY] || { retentionDays: DEFAULT_DAYS };
  selectedDays = settings.retentionDays;
  renderSelection();
}

function renderSelection() {
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.days) === selectedDays);
  });
}

document.getElementById('retentionOptions').addEventListener('click', (e) => {
  const btn = e.target.closest('.option-btn');
  if (!btn) return;
  selectedDays = Number(btn.dataset.days);
  renderSelection();
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  await chrome.storage.local.set({ [SETTINGS_KEY]: { retentionDays: selectedDays } });
  const status = document.getElementById('status');
  status.textContent = `Saved — keeping records for ${selectedDays} days.`;
  setTimeout(() => { status.textContent = ''; }, 3000);
});

loadSettings();
