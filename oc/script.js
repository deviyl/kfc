const LAST_VIEW_KEY = 'ocDicktatorLastView';

function selectView(links, frame, link) {
  const src = link.dataset.src || link.href;
  links.forEach(l => l.classList.remove('active'));
  link.classList.add('active');
  if (frame.src !== src) frame.src = src;
  try { localStorage.setItem(LAST_VIEW_KEY, src); } catch (e) {}
}

function applyHash(links, frame) {
  const hash = window.location.hash.replace('#', '');
  if (!hash) return false;
  const match = Array.from(links).find(l => l.dataset.hash === hash);
  if (!match) return false;
  selectView(links, frame, match);
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return true;
}

function initViewSwitcher() {
  const links = document.querySelectorAll('.view-link');
  const frame = document.getElementById('view-frame');
  if (!links.length || !frame) return;

  links.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); selectView(links, frame, link); }));
  window.addEventListener('hashchange', () => applyHash(links, frame));

  if (applyHash(links, frame)) return;

  let lastSrc = null;
  try { lastSrc = localStorage.getItem(LAST_VIEW_KEY); } catch (e) {}

  if (lastSrc) {
    const match = Array.from(links).find(l => (l.dataset.src || l.href) === lastSrc);
    if (match) selectView(links, frame, match);
  }
}

initViewSwitcher();
