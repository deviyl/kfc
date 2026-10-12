const LAST_VIEW_KEY = 'insuranceLastView';

function selectView(tabs, frame, tab) {
  const src = tab.dataset.src || tab.href;
  tabs.forEach(t => t.classList.remove('on'));
  tab.classList.add('on');
  if (frame.src !== src) frame.src = src;
  try { localStorage.setItem(LAST_VIEW_KEY, src); } catch (e) {}
}

function applyHash(tabs, frame) {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return false;
  const match = Array.from(tabs).find(t => t.dataset.hash === hash);
  if (!match) return false;
  selectView(tabs, frame, match);
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return true;
}

function initTabs() {
  const tabs = document.querySelectorAll('#tab-row .tab');
  const frame = document.getElementById('panel-frame');
  if (!tabs.length || !frame) return;
  window.addEventListener('message', (e) => {
    let origin = '';
    try { origin = new URL(frame.src).origin; } catch (err) {}
    const h = e.data && e.data.insuranceHeight;
    if (e.origin !== origin || typeof h !== 'number' || h <= 0) return;
    frame.style.height = Math.ceil(h) + 'px';
  });

  tabs.forEach(tab => tab.addEventListener('click', (e) => { e.preventDefault(); selectView(tabs, frame, tab); }));
  window.addEventListener('hashchange', () => applyHash(tabs, frame));

  if (applyHash(tabs, frame)) return;

  let lastSrc = null;
  try { lastSrc = localStorage.getItem(LAST_VIEW_KEY); } catch (e) {}

  if (lastSrc) {
    const match = Array.from(tabs).find(t => (t.dataset.src || t.href) === lastSrc);
    if (match) selectView(tabs, frame, match);
  }
}

initTabs();
