const LAST_VIEW_KEY = 'ocDicktatorLastView';

function selectView(links, frame, link) {
  const src = link.dataset.src || link.href;
  links.forEach(l => l.classList.remove('active'));
  link.classList.add('active');
  if (frame.src !== src) frame.src = src;
  try { localStorage.setItem(LAST_VIEW_KEY, src); } catch (e) {}
}

function initViewSwitcher() {
  const links = document.querySelectorAll('.view-link');
  const frame = document.getElementById('view-frame');
  if (!links.length || !frame) return;

  links.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); selectView(links, frame, link); }));

  const hash = window.location.hash.replace('#', '');
  const hashMatch = hash ? Array.from(links).find(l => l.dataset.hash === hash) : null;

  if (hashMatch) {
    selectView(links, frame, hashMatch);
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return;
  }

  let lastSrc = null;
  try { lastSrc = localStorage.getItem(LAST_VIEW_KEY); } catch (e) {}

  if (lastSrc) {
    const match = Array.from(links).find(l => (l.dataset.src || l.href) === lastSrc);
    if (match) selectView(links, frame, match);
  }
}

initViewSwitcher();
