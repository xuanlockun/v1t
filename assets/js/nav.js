(() => {
    const nav = document.querySelector('nav');
    const toggle = document.getElementById('hamburger');
    const menu = document.getElementById('nav-links');

    if (!nav || !toggle || !menu) return;

    const mobileQuery = window.matchMedia('(max-width: 768px)');

    function setMenuOpen(isOpen, { returnFocus = false } = {}) {
        const shouldOpen = mobileQuery.matches && isOpen;
        nav.classList.toggle('active', shouldOpen);
        toggle.setAttribute('aria-expanded', String(shouldOpen));

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
    setMenuOpen(false);
})();
