chrome.storage.local.get('url_records', (r) => {
  const records = r.url_records || [];
  document.getElementById('totalCount').textContent = records.length.toLocaleString();
});

document.getElementById('dashboardBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  window.close();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const btn = document.getElementById('exportBtn');
  btn.disabled = true;
  btn.textContent = 'Exporting…';
  chrome.runtime.sendMessage({ action: 'exportNow' }, (res) => {
    btn.disabled = false;
    btn.textContent = 'Export to Downloads';
    setTimeout(() => {}, 2000);
  });
});
