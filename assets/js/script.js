// const imageSources = [
//     '/assets/images/vit.png',
//     '/assets/images/v1t.png',
//     '/assets/images/V1t_fin.png'
//   ];

//   const randomIndex = Math.floor(Math.random() * imageSources.length);
//   document.querySelector('img.logo').src = imageSources[randomIndex];
// Hamburger toggle
const hamburger = document.getElementById('hamburger');
const nav = document.querySelector('nav');

hamburger.addEventListener('click', () => {
    nav.classList.toggle('active');
});

document.addEventListener("DOMContentLoaded", () => {
    const toggleLink = document.getElementById("darkModeToggle");
    const body = document.body;

    // Check saved preference
    if (localStorage.getItem("darkMode") === "enabled") {
        body.classList.add("dark-mode");
        toggleLink.innerHTML = '<i class="fa-solid fa-sun"></i> Light Mode';
    }

    toggleLink.addEventListener("click", (e) => {
        e.preventDefault(); // prevent page reload

        body.classList.toggle("dark-mode");

        if (body.classList.contains("dark-mode")) {
            localStorage.setItem("darkMode", "enabled");
            toggleLink.innerHTML = '<i class="fa-solid fa-sun"></i> Light Mode';
        } else {
            localStorage.setItem("darkMode", "disabled");
            toggleLink.innerHTML = '<i class="fa-solid fa-moon"></i> Dark Mode';
        }
    });
});



async function fetchGoogleSheetData() {
    const rankUrl = "https://opensheet.elk.sh/1OJ1gs4Md9wFiaMFOED06MUG1KgxuZkmzzhRvYENMCkQ/Rank";

    try {
        const rankResponse = await fetch(rankUrl).then(res => res.json());

        updateRankInfo(rankResponse);

    } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ Google Sheets:", error);
        updateRankInfo(null);
    }
}

function updateRankInfo(rankData) {
    const fallbackText = rankData ? "*" : "N/A";
    const row = rankData && rankData[0] ? rankData[0] : {};
    const overallRank = row["Overall Rating Place"] || row["Overall Rating"] || row["World Rank"] || fallbackText;
    const highestRank = row["Highest Rating Place"] || row["Highest Rank"] || row["Best Rating Place"] || fallbackText;
    const countryRank = row["Country Place"] || fallbackText;
    const countryFlagImg = rankData ? '<img src="assets/images/vn.svg" style="padding-left: 5px;" width="17.6">' : '';

    const setText = (selector, icon, label, value, extra = '') => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.innerHTML = ` <i class="${icon}" style="padding-right: 5px;"></i> ${label}: ${value} ${extra}`;
    };

    setText('#highest-rank', 'fa-solid fa-trophy', 'Highest', highestRank);
    setText('#current-rank', 'fa-solid fa-chart-line', 'Current', overallRank);
    setText('#country-rank', 'fa-solid fa-flag', 'Country place', countryRank, countryFlagImg);
    setText('#world-rank', 'fa-solid fa-earth-americas', 'World', overallRank);
}

document.addEventListener("DOMContentLoaded", fetchGoogleSheetData);

// CVE modal handlers (safe: check elements exist)
document.addEventListener('DOMContentLoaded', () => {
    const showBtn = document.getElementById('show-cves');
    const modal = document.getElementById('cve-modal');
    const closeBtn = document.getElementById('cve-close');

    if (showBtn && modal) {
        showBtn.addEventListener('click', async () => {
            modal.hidden = false;
            // render grid (lazy load data first time)
            await renderCveGrid();
            const firstFocusable = modal.querySelector('.cve-close');
            if (firstFocusable) firstFocusable.focus();
        });
    }

    async function loadCveList() {
        const listUrl = 'assets/data/cves-list.json';
        try {
            const res = await fetch(listUrl);
            const ids = await res.json();
            return Array.isArray(ids) ? ids : [];
        } catch (e) {
            console.warn('Failed to load cves-list.json', e);
            return [];
        }
    }

    // cached details map
    const cveCache = {}; // cveId -> record object
    
    let localCvesMap = null;
    async function loadLocalCvesMap() {
        if (localCvesMap !== null) return localCvesMap;
        try {
            const res = await fetch('assets/data/cves-local.json');
            if (res.ok) {
                localCvesMap = await res.json();
                return localCvesMap;
            }
        } catch (e) {
            console.warn('Failed to load cves-local.json', e);
        }
        localCvesMap = {}; // fallback to empty object
        return localCvesMap;
    }

    async function fetchCveRecord(cveId) {
        if (cveCache[cveId]) return cveCache[cveId];
        
        // check local JSON first
        const localMap = await loadLocalCvesMap();
        if (localMap[cveId]) {
            cveCache[cveId] = localMap[cveId];
            return localMap[cveId];
        }

        // try remote MITRE API as fallback
        const apiUrl = `https://cveawg.mitre.org/api/cve/${cveId}`;
        try {
            const r = await fetch(apiUrl, { cache: 'no-store' });
            if (r.ok) {
                const json = await r.json();
                cveCache[cveId] = json;
                return json;
            }
        } catch (e) {
            // ignore remote error
        }

        // if nothing, store minimal placeholder
        const placeholder = { cveMetadata: { cveId }, containers: {} };
        cveCache[cveId] = placeholder;
        return placeholder;
    }

    function makeCveCardElement(cveId, record) {
        const container = document.createElement('div');
        container.className = 'cve-card';

        const idEl = document.createElement('div');
        idEl.className = 'cve-id';
        idEl.textContent = record.cveMetadata && record.cveMetadata.cveId ? record.cveMetadata.cveId : cveId;
        container.appendChild(idEl);

        // popup detail element — appended to body so it can float above everything
        const popup = document.createElement('div');
        popup.className = 'cve-popup';
        const desc = (record.containers && record.containers.cna && record.containers.cna.descriptions && record.containers.cna.descriptions[0] && record.containers.cna.descriptions[0].value) || 'No description available.';
        const descEl = document.createElement('div');
        descEl.className = 'desc';
        descEl.innerHTML = desc;
        popup.appendChild(descEl);

        // CVSS info if present
        let cvssText = '';
        if (record.containers && record.containers.cna && record.containers.cna.metrics) {
            for (const m of record.containers.cna.metrics) {
                if (m.cvssV3_1) { cvssText = `Severity: ${m.cvssV3_1.baseSeverity} (${m.cvssV3_1.baseScore})`; break; }
                if (m.cvssV3) { cvssText = `Severity: ${m.cvssV3.baseSeverity} (${m.cvssV3.baseScore})`; break; }
            }
        }
        const cvssEl = document.createElement('div');
        cvssEl.className = 'cvss';
        cvssEl.textContent = cvssText;
        popup.appendChild(cvssEl);

        // reference link
        const refList = document.createElement('div');
        refList.className = 'refs';
        if (record.containers && record.containers.cna && record.containers.cna.references && record.containers.cna.references[0]) {
            const a = document.createElement('a');
            a.href = record.containers.cna.references[0].url || '#';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = 'Reference';
            a.style.color = 'var(--accent-yellow)';
            refList.appendChild(a);
            popup.appendChild(refList);
        }

        // append popup to body so it floats above modal and other containers
        document.body.appendChild(popup);

        // make card focusable for keyboard users
        container.tabIndex = 0;

        // show/hide helpers that position the popup near the card and keep it inside viewport
        async function showPopup() {
            try {
                const fresh = await fetchCveRecord(cveId);
                const newDesc = (fresh.containers && fresh.containers.cna && fresh.containers.cna.descriptions && fresh.containers.cna.descriptions[0] && fresh.containers.cna.descriptions[0].value) || 'No description available.';
                descEl.innerHTML = newDesc;
                let newCvss = '';
                if (fresh.containers && fresh.containers.cna && fresh.containers.cna.metrics) {
                    for (const m of fresh.containers.cna.metrics) {
                        if (m.cvssV3_1) { newCvss = `Severity: ${m.cvssV3_1.baseSeverity} (${m.cvssV3_1.baseScore})`; break; }
                        if (m.cvssV3) { newCvss = `Severity: ${m.cvssV3.baseSeverity} (${m.cvssV3.baseScore})`; break; }
                    }
                }
                cvssEl.textContent = newCvss;
                refList.innerHTML = '';
                if (fresh.containers && fresh.containers.cna && fresh.containers.cna.references && fresh.containers.cna.references[0]) {
                    const a = document.createElement('a');
                    a.href = fresh.containers.cna.references[0].url || '#';
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.textContent = 'Reference';
                    a.style.color = 'var(--accent-yellow)';
                    refList.appendChild(a);
                    if (!popup.contains(refList)) popup.appendChild(refList);
                }
            } catch (err) {
                console.warn('Failed to refresh CVE popup content for', cveId, err);
            }

            // sizing and positioning — ensure popup stays within viewport
            popup.style.display = 'block';
            popup.style.visibility = 'hidden';

            // choose width (cap to viewport)
            const maxAllowedWidth = Math.floor(window.innerWidth * 0.92);
            const popupWidth = Math.min(520, maxAllowedWidth);
            popup.style.width = popupWidth + 'px';
            popup.style.maxHeight = Math.floor(window.innerHeight * 0.78) + 'px';

            // force reflow so measurements are accurate
            // read offsetHeight to force layout
            const _ = popup.offsetHeight;

            const rect = container.getBoundingClientRect();
            // compute left (centered above card) then clamp to viewport with 8px padding
            let left = Math.round(rect.left + rect.width / 2 - popupWidth / 2);
            left = Math.max(8, Math.min(left, window.innerWidth - popupWidth - 8));

            // compute popup height after layout
            let popupHeight = popup.offsetHeight;
            if (!popupHeight) popupHeight = Math.min(300, Math.floor(window.innerHeight * 0.5));

            // compute top: prefer above, else below, clamp to viewport
            let top;
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceAbove >= popupHeight + 12) {
                // enough space above
                top = Math.round(rect.top - popupHeight - 12);
            } else if (spaceBelow >= popupHeight + 12) {
                // enough space below
                top = Math.round(rect.bottom + 12);
            } else {
                // not enough space either side — place where more room and clamp
                if (spaceBelow >= spaceAbove) {
                    top = Math.round(Math.max(8, rect.bottom + 12));
                } else {
                    top = Math.round(Math.max(8, rect.top - popupHeight - 12));
                }
                // ensure within viewport
                if (top + popupHeight > window.innerHeight - 8) top = Math.max(8, window.innerHeight - popupHeight - 8);
                if (top < 8) top = 8;
            }

            popup.style.left = left + 'px';
            popup.style.top = top + 'px';
            popup.style.visibility = 'visible';

        }

        function hidePopup() {
            popup.style.display = 'none';
        }

        // pointer interactions
        container.addEventListener('mouseenter', showPopup);
        container.addEventListener('mouseleave', hidePopup);
        container.addEventListener('focus', showPopup);
        container.addEventListener('blur', hidePopup);

        // For touch devices: toggle popup on click/tap
        container.addEventListener('touchstart', (ev) => {
            ev.stopPropagation();
            if (container.classList.toggle('popup-open')) {
                showPopup();
            } else {
                hidePopup();
            }
        });

        // also prevent accidental propagation on click after touch
        container.addEventListener('click', (ev) => { ev.stopPropagation(); });

        // On hover or focus, ensure latest data is loaded (local first, then remote)
        const refreshPopupFromRecord = async () => {
            try {
                const fresh = await fetchCveRecord(cveId);
                const newDesc = (fresh.containers && fresh.containers.cna && fresh.containers.cna.descriptions && fresh.containers.cna.descriptions[0] && fresh.containers.cna.descriptions[0].value) || 'No description available.';
                descEl.innerHTML = newDesc;
                // update cvss
                let newCvss = '';
                if (fresh.containers && fresh.containers.cna && fresh.containers.cna.metrics) {
                    for (const m of fresh.containers.cna.metrics) {
                        if (m.cvssV3_1) { newCvss = `Severity: ${m.cvssV3_1.baseSeverity} (${m.cvssV3_1.baseScore})`; break; }
                        if (m.cvssV3) { newCvss = `Severity: ${m.cvssV3.baseSeverity} (${m.cvssV3.baseScore})`; break; }
                    }
                }
                cvssEl.textContent = newCvss;
                // update reference link if present
                if (fresh.containers && fresh.containers.cna && fresh.containers.cna.references && fresh.containers.cna.references[0]) {
                    refList.innerHTML = '';
                    const a = document.createElement('a');
                    a.href = fresh.containers.cna.references[0].url || '#';
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.textContent = 'Reference';
                    a.style.color = 'var(--accent-yellow)';
                    refList.appendChild(a);
                    // ensure appended to popup
                    if (!popup.contains(refList)) popup.appendChild(refList);
                }
            } catch (err) {
                console.warn('Failed to refresh CVE popup content for', cveId, err);
            }
        };

        container.addEventListener('mouseenter', () => refreshPopupFromRecord());
        container.addEventListener('focus', () => refreshPopupFromRecord());

        return container;
    }

    async function renderCveGrid() {
        // Remove old popups to prevent DOM bloat and memory leaks
        document.querySelectorAll('.cve-popup').forEach(p => p.remove());

        const grid = document.getElementById('cve-grid');
        if (!grid) return;
        grid.innerHTML = '';
        const ids = await loadCveList();
        // create placeholders first
        for (const id of ids) {
            const placeholderCard = document.createElement('div');
            placeholderCard.className = 'cve-card';
            placeholderCard.textContent = id;
            grid.appendChild(placeholderCard);
        }
        // fetch details in parallel and replace cards
        await Promise.all(ids.map(async (id, idx) => {
            const record = await fetchCveRecord(id);
            const card = makeCveCardElement(id, record);
            // replace placeholder at position idx
            const existing = grid.children[idx];
            if (existing) grid.replaceChild(card, existing);
        }));
    }

    // Article button: navigate to articles/ when clicked (keeps semantic button element)
    const showArticlesBtn = document.getElementById('show-articles');
    if (showArticlesBtn) {
        showArticlesBtn.addEventListener('click', () => {
            const href = showArticlesBtn.dataset.href || 'articles/';
            window.location.href = href;
        });
    }

    if (closeBtn && modal) closeBtn.addEventListener('click', () => { modal.hidden = true; document.querySelectorAll('.cve-popup').forEach(p => { p.style.display = 'none'; }); });
    if (modal) {
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) modal.hidden = true; });
    }

    // Expose debug helpers to window for easier console testing when opened via file://
    try {
        window.debugCves = {
            loadCveList: async () => {
                const ids = await loadCveList();
                console.log('cve list', ids);
                return ids;
            },
            fetchCveRecord: async (id) => {
                const rec = await fetchCveRecord(id);
                console.log('cve record', id, rec);
                return rec;
            },
            renderCveGrid: async () => { await renderCveGrid(); console.log('renderCveGrid done'); },
            cache: cveCache
        };
    } catch (e) {
        /* ignore if window not writable */
    }

    // Close any touch-opened popups when clicking outside and hide floating popups
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.cve-card')) {
            document.querySelectorAll('.cve-card.popup-open').forEach(el => el.classList.remove('popup-open'));
            // hide any floating popup elements
            document.querySelectorAll('.cve-popup').forEach(p => { p.style.display = 'none'; });
        }
    });

});

document.addEventListener("DOMContentLoaded", fetchGoogleSheetData);
