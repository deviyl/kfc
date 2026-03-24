(async function () {
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;

    try {
        const res = await fetch('/kfc/nav.html');
        const html = await res.text();
        placeholder.innerHTML = html;
        placeholder.classList.add('loaded');
    } catch (e) {
        console.error('Failed to load nav:', e);
        return;
    }

    const path = window.location.pathname;
    document.querySelectorAll('[data-page]').forEach(el => {
        const page = el.dataset.page;
        const isActive =
            (page === 'home'        && path === '/kfc/')                         ||
            (page === 'activity'    && path.startsWith('/kfc/activity'))         ||
            (page === 'perks'       && path.startsWith('/kfc/perks'))            ||
            (page === 'grand-prix'  && path.includes('/kfc/grand-prix'))         ||
            (page === 'warcalc'     && path.startsWith('/kfc/warcalc'))          ||
            (page === 'userscripts' && path.startsWith('/kfc/userscripts'))      ||
            (page === 'usefullinks' && path.startsWith('/kfc/usefullinks'))      ||
            (page === 'admin'       && path.startsWith('/admin'));
        if (isActive) el.classList.add('active');
    });

    const hamburger = document.getElementById('navHamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
            hamburger.classList.toggle('open');
        });
    }
})();
