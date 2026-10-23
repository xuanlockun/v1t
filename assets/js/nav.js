(() => {
    const nav = document.querySelector('nav');
    const toggle = document.getElementById('hamburger');
    const menu = document.getElementById('nav-links');

    if (!nav || !toggle || !menu) return;

    const mobileQuery = window.matchMedia('(max-width: 768px)');

    function syncCurrentLink() {
        const normalizePath = path => {
            const normalized = String(path || '/').replace(/\/index\.html$/i, '/');
            return normalized === '/' ? '/' : `${normalized.replace(/\/+$/, '')}/`;
        };
        const currentPath = normalizePath(window.location.pathname);
        const currentHash = window.location.hash;
        const links = Array.from(menu.querySelectorAll('a[href]'));
        const candidates = links
            .map(link => ({ link, url: new URL(link.href, window.location.href) }))
            .filter(({ url }) => url.origin === window.location.origin)
            .filter(({ url }) => {
                const linkPath = normalizePath(url.pathname);
                if (url.hash) return linkPath === currentPath && url.hash === currentHash;
                return linkPath === currentPath || (linkPath !== '/' && currentPath.startsWith(linkPath));
            })
            .sort((a, b) => {
                const hashPriority = Number(Boolean(b.url.hash)) - Number(Boolean(a.url.hash));
                return hashPriority || normalizePath(b.url.pathname).length - normalizePath(a.url.pathname).length;
            });

        links.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        });

        const currentLink = candidates[0]?.link;
        if (currentLink) {
            currentLink.classList.add('active');
            currentLink.setAttribute('aria-current', 'page');
        }
    }

    function setMenuOpen(isOpen, { returnFocus = false } = {}) {
        const shouldOpen = mobileQuery.matches && isOpen;
        nav.classList.toggle('active', shouldOpen);
        toggle.setAttribute('aria-expanded', String(shouldOpen));
        toggle.setAttribute('aria-label', shouldOpen ? 'Close navigation menu' : 'Open navigation menu');

        if (mobileQuery.matches && !shouldOpen) {
            menu.setAttribute('inert', '');
        } else {
            menu.removeAttribute('inert');
        }

        if (returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', () => {
        setMenuOpen(!nav.classList.contains('active'));
    });

    menu.addEventListener('click', event => {
        if (event.target.closest('a')) setMenuOpen(false);
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && nav.classList.contains('active')) {
            setMenuOpen(false, { returnFocus: true });
        }
    });

    mobileQuery.addEventListener('change', () => setMenuOpen(false));
    window.addEventListener('hashchange', syncCurrentLink);
    syncCurrentLink();
    setMenuOpen(false);
})();
