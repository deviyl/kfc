function initViewSwitcher() {
  const links = document.querySelectorAll('.view-link');
  const frame = document.getElementById('view-frame');
  if (!links.length || !frame) return;

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const src = link.dataset.src || link.href;

      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      if (frame.src !== src) {
        frame.src = src;
      }
    });
  });
}

initViewSwitcher();
