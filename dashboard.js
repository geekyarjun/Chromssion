const SETTINGS_KEY = 'settings';
const DB_KEY = 'url_records';
const DEFAULT_DAYS = 30;

let allRecords = [];
let selectedTabIds = new Set(); // tabIds of selected rows
let selectedDays = DEFAULT_DAYS;
let searchQuery = '';

// ── Tab navigation ────────────────────────────────────────────────────────────

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
  });
});

// ── Selection helpers ─────────────────────────────────────────────────────────

function updateSelectionBar() {
  const bar = document.getElementById('selectionBar');
  const count = document.getElementById('selectionCount');
  if (selectedTabIds.size === 0) {
    bar.classList.remove('visible');
  } else {
    bar.classList.add('visible');
    count.textContent = `${selectedTabIds.size} record${selectedTabIds.size !== 1 ? 's' : ''} selected`;
  }
}

function toggleRowSelection(tabId, rowEl, cbEl) {
  if (selectedTabIds.has(tabId)) {
    selectedTabIds.delete(tabId);
    rowEl.classList.remove('selected');
    cbEl.checked = false;
  } else {
    selectedTabIds.add(tabId);
    rowEl.classList.add('selected');
    cbEl.checked = true;
  }
  updateSelectionBar();
  syncWindowCheckboxes();
}

function syncWindowCheckboxes() {
  document.querySelectorAll('.window-group').forEach(group => {
    const windowId = Number(group.dataset.window);
    const windowTabs = allRecords.filter(r => r.windowId === windowId);
    const allSelected = windowTabs.length > 0 && windowTabs.every(r => selectedTabIds.has(r.tabId));
    const cb = group.querySelector('.window-cb');
    if (cb) {
      cb.checked = allSelected;
      cb.indeterminate = !allSelected && windowTabs.some(r => selectedTabIds.has(r.tabId));
    }
  });
}

// ── Records rendering ─────────────────────────────────────────────────────────

function groupByWindow(records) {
  const map = new Map();
  for (const r of records) {
    if (!map.has(r.windowId)) map.set(r.windowId, []);
    map.get(r.windowId).push(r);
  }
  return map;
}

function renderRecords() {
  const body = document.getElementById('recordsBody');
  const meta = document.getElementById('toolbarMeta');

  const q = searchQuery.toLowerCase();
  const filtered = q
    ? allRecords.filter(r => r.url.toLowerCase().includes(q) || (r.title || '').toLowerCase().includes(q))
    : allRecords;

  meta.textContent = `${filtered.length.toLocaleString()} record${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    body.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔗</div>
      <div class="empty-title">${searchQuery ? 'No matches' : 'No records yet'}</div>
      <div class="empty-desc">${searchQuery ? 'Try a different search term.' : 'Browse some pages and they\'ll appear here.'}</div>
    </div>`;
    return;
  }

  const groups = groupByWindow(filtered);
  const windowIds = [...groups.keys()].sort((a, b) => a - b);
  const colorCount = 5;

  body.innerHTML = windowIds.map((windowId, wi) => {
    const tabs = groups.get(windowId);
    const colorClass = `c${wi % colorCount}`;
    return `
      <div class="window-group" data-window="${windowId}">
        <div class="window-header">
          <input type="checkbox" class="cb window-cb" title="Select all in Window ${windowId}" data-window="${windowId}" />
          <div class="window-toggle" data-toggle-window="${windowId}">
            <span class="window-label">Window ${windowId}</span>
            <span class="window-count">${tabs.length} tab${tabs.length !== 1 ? 's' : ''}</span>
            <span class="chevron">▾</span>
          </div>
          <button class="btn-open-window" data-open-window="${windowId}" title="Open all tabs in a new window">
            ↗ Open all
          </button>
        </div>
        <div class="tab-list">
          ${tabs.map((r, i) => `
            <div class="tab-row${selectedTabIds.has(r.tabId) ? ' selected' : ''}" data-tabid="${r.tabId}">
              <input type="checkbox" class="cb row-cb" data-tabid="${r.tabId}" ${selectedTabIds.has(r.tabId) ? 'checked' : ''} />
              <span class="tab-num">${i + 1}</span>
              <img class="tab-favicon" src="https://www.google.com/s2/favicons?domain=${escAttr(new URL(r.url).hostname)}&sz=32" alt="" onerror="this.style.visibility='hidden'" />
              <a class="tab-url-link" href="${escAttr(r.url)}" target="_blank" rel="noopener noreferrer" title="${escAttr(r.url)}">${highlight(escHtml(r.url), q)}</a>
              <span class="tab-title" title="${escAttr(r.title || '')}">${highlight(escHtml(r.title || '—'), q)}</span>
              <span class="tab-time">${r.date}<br>${r.time}</span>
              <button class="btn-delete-row" title="Delete" data-tabid="${r.tabId}">✕</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Wire up row checkboxes
  document.querySelectorAll('.row-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const tabId = Number(cb.dataset.tabid);
      const row = cb.closest('.tab-row');
      if (cb.checked) {
        selectedTabIds.add(tabId);
        row.classList.add('selected');
      } else {
        selectedTabIds.delete(tabId);
        row.classList.remove('selected');
      }
      updateSelectionBar();
      syncWindowCheckboxes();
    });
  });

  // Wire up window-level checkboxes (select all in window)
  document.querySelectorAll('.window-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const windowId = Number(cb.dataset.window);
      const windowTabs = allRecords.filter(r => r.windowId === windowId);
      windowTabs.forEach(r => {
        const row = document.querySelector(`.tab-row[data-tabid="${r.tabId}"]`);
        const rowCb = row?.querySelector('.row-cb');
        if (cb.checked) {
          selectedTabIds.add(r.tabId);
          row?.classList.add('selected');
          if (rowCb) rowCb.checked = true;
        } else {
          selectedTabIds.delete(r.tabId);
          row?.classList.remove('selected');
          if (rowCb) rowCb.checked = false;
        }
      });
      updateSelectionBar();
    });
  });

  // Wire up single-row delete buttons
  document.querySelectorAll('.btn-delete-row').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const tabId = Number(btn.dataset.tabid);
      await deleteRecords(new Set([tabId]));
    });
  });

  syncWindowCheckboxes();
}

function toggleWindow(windowId) {
  const group = document.querySelector(`.window-group[data-window="${windowId}"]`);
  if (group) group.classList.toggle('collapsed');
}

function openWindowTabs(windowId) { // don't collapse the window group
  const urls = allRecords
    .filter(r => r.windowId === windowId)
    .map(r => r.url);
  if (urls.length === 0) return;
  // Open first URL as the new window, rest as additional tabs
  chrome.windows.create({ url: urls[0], focused: true }, (win) => {
    urls.slice(1).forEach(url => {
      chrome.tabs.create({ windowId: win.id, url });
    });
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function highlight(str, q) {
  if (!q) return str;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return str.replace(new RegExp(`(${escaped})`, 'gi'), '<mark style="background:rgba(62,207,142,0.25);color:#059669;border-radius:2px">$1</mark>');
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteRecords(tabIdSet) {
  const result = await chrome.storage.local.get(DB_KEY);
  const records = result[DB_KEY] || [];
  const updated = records.filter(r => !tabIdSet.has(r.tabId));
  await chrome.storage.local.set({ [DB_KEY]: updated });

  // Remove deleted from selection
  tabIdSet.forEach(id => selectedTabIds.delete(id));
  allRecords = updated;

  renderRecords();
  updateSelectionBar();
  showToast(`Deleted ${tabIdSet.size} record${tabIdSet.size !== 1 ? 's' : ''}`, 'success');
}

document.getElementById('deleteSelectedBtn').addEventListener('click', async () => {
  if (selectedTabIds.size === 0) return;
  await deleteRecords(new Set(selectedTabIds));
});

document.getElementById('deselectAllBtn').addEventListener('click', () => {
  selectedTabIds.clear();
  document.querySelectorAll('.tab-row.selected').forEach(r => r.classList.remove('selected'));
  document.querySelectorAll('.row-cb, .window-cb').forEach(cb => { cb.checked = false; cb.indeterminate = false; });
  updateSelectionBar();
});

// ── Event delegation for dynamically rendered elements ────────────────────────

document.getElementById('recordsBody').addEventListener('click', (e) => {
  // Toggle window collapse
  const toggle = e.target.closest('[data-toggle-window]');
  if (toggle) {
    toggleWindow(Number(toggle.dataset.toggleWindow));
    return;
  }
  // Open all tabs in window
  const openBtn = e.target.closest('[data-open-window]');
  if (openBtn) {
    e.stopPropagation();
    openWindowTabs(Number(openBtn.dataset.openWindow));
    return;
  }
});

// ── Search ────────────────────────────────────────────────────────────────────

document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  renderRecords();
});

// ── Settings ──────────────────────────────────────────────────────────────────

document.getElementById('retentionOptions').addEventListener('click', e => {
  const btn = e.target.closest('.option-btn');
  if (!btn) return;
  selectedDays = Number(btn.dataset.days);
  document.querySelectorAll('.option-btn').forEach(b => b.classList.toggle('active', b === btn));
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  await chrome.storage.local.set({ [SETTINGS_KEY]: { retentionDays: selectedDays } });
  const status = document.getElementById('saveStatus');
  status.textContent = `Saved — keeping records for ${selectedDays} days`;
  setTimeout(() => { status.textContent = ''; }, 3000);
});

// ── Export ────────────────────────────────────────────────────────────────────

document.getElementById('exportBtn').addEventListener('click', () => {
  const btn = document.getElementById('exportBtn');
  btn.disabled = true;
  btn.textContent = 'Exporting…';
  chrome.runtime.sendMessage({ action: 'exportNow' }, (res) => {
    btn.disabled = false;
    btn.textContent = 'Export';
    showToast(
      res?.ok
        ? (res.driveSync ? 'Saved to Downloads + Google Drive' : 'Saved to Downloads')
        : 'Export failed',
      res?.ok ? 'success' : 'error'
    );
  });
});

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const [recordsResult, settingsResult] = await Promise.all([
    chrome.storage.local.get(DB_KEY),
    chrome.storage.local.get(SETTINGS_KEY),
  ]);

  allRecords = recordsResult[DB_KEY] || [];
  const settings = settingsResult[SETTINGS_KEY] || { retentionDays: DEFAULT_DAYS };
  selectedDays = settings.retentionDays;

  document.querySelectorAll('.option-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.days) === selectedDays);
  });

  renderRecords();
}

init();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[DB_KEY]) {
    allRecords = changes[DB_KEY].newValue || [];
    renderRecords();
  }
});
