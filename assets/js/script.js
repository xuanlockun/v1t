// const imageSources = [
//     '/assets/images/vit.png',
//     '/assets/images/v1t.png',
//     '/assets/images/V1t_fin.png'
//   ];

//   const randomIndex = Math.floor(Math.random() * imageSources.length);
//   document.querySelector('img.logo').src = imageSources[randomIndex];
const FETCH_TIMEOUT_MS = 10000;

async function fetchWithTimeout(resource, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const externalSignal = options.signal;
    let timedOut = false;

    const abortFromExternalSignal = () => controller.abort();
    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort();
        } else {
            externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true });
        }
    }

    const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    try {
        const fetchUrl = (typeof resource === 'string' && resource.startsWith('assets/')) ? '/' + resource : resource;
        return await fetch(fetchUrl, { ...options, signal: controller.signal });
    } catch (error) {
        if (timedOut) {
            const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
            timeoutError.name = 'TimeoutError';
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
        if (externalSignal) {
            externalSignal.removeEventListener('abort', abortFromExternalSignal);
        }
    }
}

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
    const rankTargets = ['#highest-rank', '#current-rank', '#country-rank', '#world-rank'];
    if (!rankTargets.some(selector => document.querySelector(selector))) return;

    try {
        const response = await fetchWithTimeout(rankUrl);
        if (!response.ok) {
            throw new Error(`Ranking request failed: HTTP ${response.status}`);
        }
        const rankResponse = await response.json();

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
    const setText = (selector, icon, label, value, showCountryFlag = false) => {
        const el = document.querySelector(selector);
        if (!el) return;
        el.replaceChildren();
        const iconEl = document.createElement('i');
        iconEl.className = icon;
        iconEl.style.paddingRight = '5px';
        el.append(iconEl, document.createTextNode(` ${label}: ${value}`));
        if (showCountryFlag && rankData) {
            const flag = document.createElement('img');
            flag.src = 'assets/images/vn.svg';
            flag.alt = 'Vietnam';
            flag.width = 18;
            flag.style.paddingLeft = '5px';
            el.appendChild(flag);
        }
    };

    setText('#highest-rank', 'fa-solid fa-trophy', 'Highest', highestRank);
    setText('#current-rank', 'fa-solid fa-chart-line', 'Current', overallRank);
    setText('#country-rank', 'fa-solid fa-flag', 'Country place', countryRank, true);
    setText('#world-rank', 'fa-solid fa-earth-americas', 'World', overallRank);
}

document.addEventListener("DOMContentLoaded", fetchGoogleSheetData);

// Hover Counter for Hero Section 3D Effects
document.addEventListener("DOMContentLoaded", () => {
    const statsLayout = document.querySelector('.stats-layout');
    // Thẻ giữa là child thứ 2 trong stats-layout (vì child 3 là thẻ ẩn, child 4 là socials)
    // Thực tế thẻ giữa mang class 'expand-x'
    const middleCard = statsLayout ? statsLayout.querySelector('.small_container.expand-x') : null;

    if (statsLayout && middleCard) {
        let hoverCount = 0;
        let isAnimating = false;
        let shouldRemoveHover = false;

        middleCard.addEventListener('mouseenter', () => {
            hoverCount++;
            let state = hoverCount % 3;
            if (state === 0) state = 3;

            statsLayout.setAttribute('data-hover-state', state);
            statsLayout.classList.add('trigger-hover');
            shouldRemoveHover = false;

            if (state === 3) {
                isAnimating = true;
            }
        });

        middleCard.addEventListener('mouseleave', () => {
            let state = statsLayout.getAttribute('data-hover-state');
            if (state == "3" && isAnimating) {
                // Wait for the animation to complete its loop before removing the hover effect
                shouldRemoveHover = true;
            } else {
                statsLayout.classList.remove('trigger-hover');
            }
        });

        // Listen for the end of the animation loop on the left card
        const leftCard = statsLayout.querySelector('.small_container:nth-child(1)');
        if (leftCard) {
            leftCard.addEventListener('animationiteration', (e) => {
                if (e.animationName === 'leftCardHoverCycle') {
                    if (shouldRemoveHover) {
                        statsLayout.classList.remove('trigger-hover');
                        isAnimating = false;
                        shouldRemoveHover = false;
                    }
                }
            });
        }
    }
});

// CVE modal handlers (safe: check elements exist)
document.addEventListener('DOMContentLoaded', () => {
    const showBtn = document.getElementById('show-cves');
    const modal = document.getElementById('cve-modal');
    const closeBtn = document.getElementById('cve-close');
    let lastFocusedElement = null;
    let cveGridRendered = false;
    let cveGridItems = [];
    let cveSortMode = 'id-desc';
    const DEFAULT_CVE_FINDER_FILTERS = ['rawr', 'jaze'];
    let cveFinderFilters = new Set(DEFAULT_CVE_FINDER_FILTERS);

    const MODAL_FOCUSABLE_SELECTOR = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    function getModalFocusableElements() {
        if (!modal || modal.hidden) return [];
        return Array.from(modal.querySelectorAll(MODAL_FOCUSABLE_SELECTOR))
            .filter(element => !element.hidden && element.getClientRects().length > 0);
    }

    function trapModalFocus(event) {
        if (event.key !== 'Tab' || !modal || modal.hidden) return;
        const focusable = getModalFocusableElements();
        if (!focusable.length) {
            event.preventDefault();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    const isStandalonePage = document.body.classList.contains('cve-page') || (!showBtn && Boolean(modal));

    async function openCveModal({ focusClose = true } = {}) {
        if (!modal) return;
        modal.hidden = false;
        document.body.classList.add('cve-modal-open');
        if (focusClose) closeBtn?.focus();
        cveSortMode = 'id-desc';
        cveFinderFilters = new Set(DEFAULT_CVE_FINDER_FILTERS);
        if (!cveGridRendered) {
            cveGridRendered = await renderCveGrid();
        } else {
            applyCveGridFilters();
            hydrateMissingCveCards();
        }

        // Support Deep Linking via URL Hash (#CVE-XXXX-YYYY)
        const hash = (window.location.hash || '').replace(/^#/, '').toUpperCase().trim();
        if (hash) {
            setTimeout(() => {
                const targetCard = Array.from(document.querySelectorAll('.cve-card')).find(c => {
                    const idEl = c.querySelector('.cve-id');
                    return idEl && idEl.textContent.trim().toUpperCase() === hash;
                });
                if (targetCard) {
                    targetCard.click();
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 60);
        }
    }

    if (showBtn && modal) {
        showBtn.addEventListener('click', async () => {
            lastFocusedElement = document.activeElement;
            await openCveModal({ focusClose: true });
        });
    }

    // Interactive Hero Cockpit Toggle
    const duckToggle = document.getElementById('duck-toggle');
    const heroStage = document.getElementById('hero-stage');
    const duckHintText = document.querySelector('#duck-hint .pill-text');

    if (duckToggle && heroStage) {
        const toggleHeroCockpit = () => {
            const isActive = heroStage.classList.toggle('cockpit-active');
            if (duckHintText) {
                duckHintText.textContent = isActive ? 'COLLAPSE ✕' : 'CLICK THE DUCK!';
            }
            // Trigger duck hop animation
            const duckImg = duckToggle.querySelector('.stage-logo');
            if (duckImg) {
                duckImg.classList.add('duck-hop');
                setTimeout(() => duckImg.classList.remove('duck-hop'), 600);
            }
            if (isActive && typeof window.onCockpitOpen === 'function') {
                window.onCockpitOpen();
            } else if (!isActive && typeof window.onCockpitClose === 'function') {
                window.onCockpitClose();
            }
        };

        duckToggle.addEventListener('click', toggleHeroCockpit);
        duckToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleHeroCockpit();
            }
        });
    }

    // Dynamic Team Members Store (loaded from assets/data/members.json)
    const TEAM_MEMBERS = {};
    let membersDataPromise = null;

    function renderTeamProfiles(members) {
        const container = document.getElementById('profile-container') || document.querySelector('.profile-container');
        if (!container || !Array.isArray(members)) return;

        container.innerHTML = members.map(m => {
            const quoteClass = m.quoteClass || 'quote';
            const quoteText = m.quote ? `<p class="${quoteClass}">${m.quote}</p>` : '';
            const blogLink = m.blog ? `<a href="${m.blog}" target="_blank" rel="noopener noreferrer">BLOG</a>` : '';
            const role = m.role || 'Member';
            const avatar = m.avatar || `/assets/images/${(m.id || m.name).toLowerCase()}.png`;

            return `
                <div class="profile-card">
                    <img src="${avatar}" alt="${m.name}" loading="lazy" onerror="this.onerror=null; this.src='/assets/images/v1t.png';">
                    <h3>${m.name}</h3>
                    <h4>${role}</h4>
                    ${quoteText}
                    ${blogLink}
                </div>
            `;
        }).join('');
    }

    /**
     * Hàm tính toán số lượng thành viên thực tế từ dữ liệu
     * Lọc và đếm chính xác số lượng member hợp lệ trong danh sách
     * @param {Array} membersList - Danh sách member từ members.json
     * @returns {number} Số lượng thành viên tính được
     */
    function calculateMembersCount(membersList) {
        if (Array.isArray(membersList) && membersList.length > 0) {
            return membersList.filter(m => m && (m.name || m.id)).length;
        }
        // Fallback: nếu danh sách DOM đã được render
        const rendered = document.querySelectorAll('#members-list .member-tag, .members-cloud .member-tag');
        return rendered ? rendered.length : 0;
    }

    /**
     * Cập nhật badge số lượng member trên hero card dựa vào hàm tính toán động
     * @param {Array|number} source - Danh sách member hoặc số đếm đã tính
     */
    function updateMembersCountBadge(source) {
        const countBadge = document.getElementById('members-count-badge');
        if (!countBadge) return;

        const count = typeof source === 'number' ? source : calculateMembersCount(source);
        countBadge.textContent = `${count} DUCKS`;
        countBadge.setAttribute('data-count', String(count));
    }

    // Gắn vào window để có thể gọi hoặc kiểm tra từ bên ngoài
    window.calculateMembersCount = calculateMembersCount;
    window.updateMembersCountBadge = updateMembersCountBadge;

    function renderMembersList(members) {
        const listEl = document.getElementById('members-list') || document.querySelector('.members-list') || document.querySelector('.members-cloud');
        if (!listEl || !Array.isArray(members)) return;

        // Gọi hàm tính toán số lượng động và hiển thị lên badge
        updateMembersCountBadge(members);

        listEl.innerHTML = members.map(m => {
            if (m.ctftime) {
                return `<a href="${m.ctftime}" target="_blank" rel="noopener noreferrer" class="member-tag">${m.name}</a>`;
            } else {
                return `<span class="member-tag">${m.name}</span>`;
            }
        }).join('\n                ');
    }

    async function loadMembersData() {
        if (membersDataPromise) return membersDataPromise;

        membersDataPromise = (async () => {
            try {
                const res = await fetchWithTimeout('assets/data/members.json');
                if (!res.ok) {
                    throw new Error(`members.json request failed: HTTP ${res.status}`);
                }
                const list = await res.json();
                if (!Array.isArray(list)) throw new Error('members.json root must be an array.');

                list.forEach(m => {
                    if (!m || !m.name) return;
                    const memberInfo = {
                        id: m.id || m.name.toLowerCase(),
                        name: m.name,
                        avatar: m.avatar || `assets/images/${(m.id || m.name).toLowerCase()}.png`,
                        role: m.role || 'Member',
                        quote: m.quote || '',
                        quoteClass: m.quoteClass || 'quote',
                        blog: m.blog || null,
                        ctftime: m.ctftime || null
                    };

                    if (m.id) TEAM_MEMBERS[m.id.toLowerCase().trim()] = memberInfo;
                    TEAM_MEMBERS[m.name.toLowerCase().trim()] = memberInfo;

                    if (Array.isArray(m.aliases)) {
                        m.aliases.forEach(alias => {
                            if (alias) TEAM_MEMBERS[String(alias).toLowerCase().trim()] = memberInfo;
                        });
                    }
                });

                renderTeamProfiles(list);
                renderMembersList(list);
                return list;
            } catch (e) {
                membersDataPromise = null;
                console.warn('Failed to load members.json', e);
            }
            return [];
        })();

        return membersDataPromise;
    }

    const pageNeedsMembers = Boolean(
        document.getElementById('profile-container') ||
        document.getElementById('members-list') ||
        document.getElementById('cve-modal')
    );
    if (pageNeedsMembers) loadMembersData();

    function getFinderInfo(finderInput) {
        if (!finderInput) return null;
        if (typeof finderInput === 'object') {
            const name = finderInput.name || finderInput.finder || 'Finder';
            const key = name.toLowerCase().trim();
            const base = TEAM_MEMBERS[key] || {};
            return {
                name: name,
                avatar: finderInput.avatar || base.avatar || `assets/images/${key}.png`,
                role: finderInput.role || base.role || 'Finder'
            };
        }
        const name = String(finderInput).trim();
        const key = name.toLowerCase();
        if (TEAM_MEMBERS[key]) {
            return { ...TEAM_MEMBERS[key] };
        }
        return {
            name: name,
            avatar: `assets/images/${key}.png`,
            role: 'Finder'
        };
    }

    function getFinderName(finderInput) {
        if (!finderInput) return '';
        if (typeof finderInput === 'object') {
            return String(finderInput.name || finderInput.finder || '').trim();
        }
        return String(finderInput).trim();
    }

    function normalizeFinderKey(finderInput) {
        return getFinderName(finderInput).toLowerCase();
    }

    function compareCveIds(a, b, direction = 'desc') {
        const officialPattern = /^CVE-(\d{4})-(\d+)$/i;
        const aMatch = String(a.id || '').match(officialPattern);
        const bMatch = String(b.id || '').match(officialPattern);

        // Official numeric IDs stay ahead of custom research labels in both directions.
        if (Boolean(aMatch) !== Boolean(bMatch)) return aMatch ? -1 : 1;

        let result = 0;
        if (aMatch && bMatch) {
            const yearDifference = Number(aMatch[1]) - Number(bMatch[1]);
            result = yearDifference || (Number(aMatch[2]) - Number(bMatch[2]));
        } else {
            result = String(a.id || '').localeCompare(String(b.id || ''), undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        }

        return direction === 'desc' ? -result : result;
    }

    function getCveSeverityRank(item) {
        const record = cveStore[item.id] || cveStore[String(item.id || '').toLowerCase()] || null;
        const severityClass = getSeverityClass(record, item);
        return {
            'severity-critical': 4,
            'severity-high': 3,
            'severity-medium': 2,
            'severity-low': 1,
            'severity-pending': 0
        }[severityClass] ?? -1;
    }

    function compareCveItems(a, b) {
        if (cveSortMode === 'severity-desc') {
            const severityDifference = getCveSeverityRank(b) - getCveSeverityRank(a);
            return severityDifference || compareCveIds(a, b, 'desc');
        }

        return compareCveIds(a, b, cveSortMode === 'id-asc' ? 'asc' : 'desc');
    }

    function updateCveFilterControls() {
        const toolbar = document.getElementById('cve-filter-toolbar');
        if (!toolbar) return;

        const sortSelect = document.getElementById('cve-sort-select');
        if (sortSelect) sortSelect.value = cveSortMode;

        const defaultFiltersActive = DEFAULT_CVE_FINDER_FILTERS.length === cveFinderFilters.size
            && DEFAULT_CVE_FINDER_FILTERS.every(key => cveFinderFilters.has(key));
        let selectedFinder = '';
        if (cveFinderFilters.size === 0) {
            selectedFinder = 'all';
        } else if (defaultFiltersActive) {
            selectedFinder = 'default';
        } else if (cveFinderFilters.size === 1) {
            selectedFinder = Array.from(cveFinderFilters)[0];
        }

        const finderTrigger = document.getElementById('cve-finder-trigger');
        const finderMenu = document.getElementById('cve-finder-menu');
        if (!finderTrigger || !finderMenu || !selectedFinder) return;

        const options = Array.from(finderMenu.querySelectorAll('[data-cve-finder]'));
        const selectedOption = options.find(option => option.dataset.cveFinder === selectedFinder);
        const triggerLabel = finderTrigger.querySelector('.cve-filter-trigger-label');
        if (triggerLabel && selectedOption) {
            triggerLabel.textContent = selectedOption.dataset.label || selectedOption.textContent.trim();
        }
        finderTrigger.dataset.value = selectedFinder;
        options.forEach(option => {
            const isSelected = option.dataset.cveFinder === selectedFinder;
            option.classList.toggle('active', isSelected);
            option.setAttribute('aria-selected', String(isSelected));
        });
    }

    function applyCveGridFilters() {
        const grid = document.getElementById('cve-grid');
        if (!grid || !cveGridItems.length) return;

        let visibleCount = 0;
        [...cveGridItems].sort(compareCveItems).forEach(item => {
            const context = cveCardContexts.get(item.id);
            if (!context || !context.card) return;

            const finderKeys = (item.finders || []).map(normalizeFinderKey).filter(Boolean);
            const isVisible = cveFinderFilters.size === 0
                || finderKeys.some(key => cveFinderFilters.has(key));
            context.card.hidden = !isVisible;
            context.card.setAttribute('aria-hidden', String(!isVisible));
            grid.appendChild(context.card);
            if (isVisible) visibleCount++;
        });

        const activeCard = grid.querySelector('.cve-card.active');
        if (activeCard && activeCard.hidden) {
            activeCard.classList.remove('active');
            activeCard.setAttribute('aria-expanded', 'false');
            if (modal) modal.classList.remove('split-mode');
        }

        document.querySelectorAll('.cve-popup').forEach(popup => {
            popup.style.display = 'none';
        });

        const status = document.getElementById('cve-filter-status');
        if (status) {
            status.textContent = `${visibleCount}/${cveGridItems.length}`;
            status.setAttribute('aria-label', `${visibleCount} of ${cveGridItems.length} CVEs shown`);
        }

        updateCveFilterControls();
    }

    function renderCveFilterControls(listItems) {
        const toolbar = document.getElementById('cve-filter-toolbar');
        if (!toolbar) return;

        const finderMap = new Map();
        listItems.forEach(item => {
            (item.finders || []).forEach(finder => {
                const key = normalizeFinderKey(finder);
                if (!key) return;
                const finderInfo = getFinderInfo(finder);
                const current = finderMap.get(key) || {
                    name: finderInfo?.name || getFinderName(finder),
                    avatar: finderInfo?.avatar || '/assets/images/v1t.png',
                    count: 0
                };
                current.count++;
                finderMap.set(key, current);
            });
        });

        cveFinderFilters = new Set(
            Array.from(cveFinderFilters).filter(key => finderMap.has(key))
        );

        toolbar.replaceChildren();

        const sortField = document.createElement('div');
        sortField.className = 'cve-filter-field cve-sort-field';
        const sortSelect = document.createElement('select');
        sortSelect.id = 'cve-sort-select';
        sortSelect.className = 'cve-filter-select';
        sortSelect.setAttribute('aria-label', 'Sort CVEs');
        [
            ['id-desc', 'CVE: LARGE TO SMALL'],
            ['id-asc', 'CVE: SMALL TO LARGE'],
            ['severity-desc', 'SEVERITY: CRITICAL TO LOW']
        ].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            sortSelect.appendChild(option);
        });
        sortField.appendChild(sortSelect);

        const finderField = document.createElement('div');
        finderField.className = 'cve-filter-field cve-finder-field';
        document.getElementById('cve-finder-menu')?.remove();
        const finderTrigger = document.createElement('button');
        finderTrigger.type = 'button';
        finderTrigger.id = 'cve-finder-trigger';
        finderTrigger.className = 'cve-filter-select cve-finder-trigger';
        finderTrigger.setAttribute('aria-label', 'Filter CVEs by finder');
        finderTrigger.setAttribute('aria-haspopup', 'listbox');
        finderTrigger.setAttribute('aria-expanded', 'false');
        finderTrigger.setAttribute('aria-controls', 'cve-finder-menu');
        const finderTriggerLabel = document.createElement('span');
        finderTriggerLabel.className = 'cve-filter-trigger-label';
        finderTrigger.appendChild(finderTriggerLabel);

        const finderMenu = document.createElement('div');
        finderMenu.id = 'cve-finder-menu';
        finderMenu.className = 'cve-finder-menu';
        finderMenu.setAttribute('role', 'listbox');
        finderMenu.setAttribute('aria-label', 'Filter CVEs by finder');
        finderMenu.hidden = true;

        function createFinderOption(value, label, avatars = []) {
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'cve-finder-option';
            option.dataset.cveFinder = value;
            option.dataset.label = label;
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');

            const optionLabel = document.createElement('span');
            optionLabel.className = 'cve-finder-option-label';
            optionLabel.textContent = label;
            option.appendChild(optionLabel);

            if (avatars.length) {
                const avatarGroup = document.createElement('span');
                avatarGroup.className = 'cve-finder-option-avatars';
                avatarGroup.setAttribute('aria-hidden', 'true');
                avatars.forEach(({ name, avatar }) => {
                    const image = document.createElement('img');
                    image.className = 'cve-finder-option-avatar';
                    image.src = avatar || '/assets/images/v1t.png';
                    image.alt = '';
                    image.loading = 'lazy';
                    image.title = name;
                    image.onerror = () => {
                        image.onerror = null;
                        image.src = '/assets/images/v1t.png';
                    };
                    avatarGroup.appendChild(image);
                });
                option.appendChild(avatarGroup);
            }

            return option;
        }

        const defaultFinderAvatars = DEFAULT_CVE_FINDER_FILTERS
            .map(key => finderMap.get(key))
            .filter(Boolean);
        finderMenu.append(
            createFinderOption('default', 'FINDER: RAWR + JAZE', defaultFinderAvatars),
            createFinderOption('all', 'FINDER: ALL')
        );

        Array.from(finderMap.entries())
            .sort((a, b) => a[1].name.localeCompare(b[1].name, undefined, { sensitivity: 'base' }))
            .forEach(([key, finder]) => {
                finderMenu.appendChild(createFinderOption(
                    key,
                    `${finder.name.toUpperCase()} (${finder.count})`,
                    [finder]
                ));
            });
        finderField.appendChild(finderTrigger);

        const status = document.createElement('output');
        status.id = 'cve-filter-status';
        status.className = 'cve-filter-status';
        status.setAttribute('aria-live', 'polite');

        toolbar.append(sortField, finderField, status);
        document.body.appendChild(finderMenu);

        sortSelect.addEventListener('change', () => {
            cveSortMode = sortSelect.value;
            applyCveGridFilters();
        });

        function selectFinder(finderKey) {
            if (finderKey === 'all') {
                cveFinderFilters.clear();
            } else if (finderKey === 'default') {
                cveFinderFilters = new Set(
                    DEFAULT_CVE_FINDER_FILTERS.filter(key => finderMap.has(key))
                );
            } else {
                cveFinderFilters = new Set([finderKey]);
            }
            applyCveGridFilters();
        }

        function positionFinderMenu() {
            const triggerRect = finderTrigger.getBoundingClientRect();
            const viewportGap = 8;
            finderMenu.style.minWidth = `${Math.max(triggerRect.width, 220)}px`;
            const menuRect = finderMenu.getBoundingClientRect();
            const left = Math.max(
                viewportGap,
                Math.min(triggerRect.left, window.innerWidth - menuRect.width - viewportGap)
            );
            let top = triggerRect.bottom + 7;
            if (top + menuRect.height > window.innerHeight - viewportGap
                && triggerRect.top > menuRect.height + viewportGap) {
                top = triggerRect.top - menuRect.height - 7;
            }
            finderMenu.style.left = `${left}px`;
            finderMenu.style.top = `${Math.max(viewportGap, top)}px`;
        }

        function setFinderMenuOpen(isOpen, focusSelected = false) {
            finderMenu.hidden = !isOpen;
            finderTrigger.setAttribute('aria-expanded', String(isOpen));
            finderField.classList.toggle('is-open', isOpen);
            if (!isOpen) return;

            positionFinderMenu();
            if (focusSelected) {
                const selectedOption = Array.from(finderMenu.querySelectorAll('[data-cve-finder]'))
                    .find(option => option.getAttribute('aria-selected') === 'true');
                (selectedOption || finderMenu.querySelector('[data-cve-finder]'))?.focus();
            }
        }

        finderTrigger.addEventListener('click', () => {
            setFinderMenuOpen(finderMenu.hidden);
        });
        finderTrigger.addEventListener('keydown', event => {
            if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setFinderMenuOpen(true, true);
            }
        });

        const finderOptions = Array.from(finderMenu.querySelectorAll('[data-cve-finder]'));
        finderOptions.forEach(option => {
            option.addEventListener('click', () => {
                selectFinder(option.dataset.cveFinder);
                setFinderMenuOpen(false);
                finderTrigger.focus();
            });
            option.addEventListener('keydown', event => {
                const currentIndex = finderOptions.indexOf(option);
                let nextIndex = null;
                if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % finderOptions.length;
                if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + finderOptions.length) % finderOptions.length;
                if (event.key === 'Home') nextIndex = 0;
                if (event.key === 'End') nextIndex = finderOptions.length - 1;
                if (nextIndex !== null) {
                    event.preventDefault();
                    finderOptions[nextIndex].focus();
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    setFinderMenuOpen(false);
                    finderTrigger.focus();
                }
            });
        });

        document.addEventListener('click', event => {
            if (!finderField.contains(event.target) && !finderMenu.contains(event.target)) {
                setFinderMenuOpen(false);
            }
        });
        window.addEventListener('resize', () => setFinderMenuOpen(false));
        window.addEventListener('scroll', () => setFinderMenuOpen(false));

        updateCveFilterControls();
    }

    async function loadCveList() {
        const listUrl = 'assets/data/cves-list.json';
        try {
            const res = await fetchWithTimeout(listUrl);
            if (!res.ok) throw new Error(`cves-list.json request failed: HTTP ${res.status}`);
            const rawList = await res.json();
            const contract = window.V1TCveListContract;
            if (!contract || typeof contract.normalizeCveList !== 'function') {
                throw new Error('CVE list contract failed to load.');
            }
            return contract.normalizeCveList(rawList);
        } catch (e) {
            console.warn('Failed to load cves-list.json', e);
            return [];
        }
    }

    // In-memory RAM store shared by local cache records and live MITRE hydration.
    const cveStore = {}; // cveId -> record object
    let cveStoreInitialized = false;
    let cveStorePromise = null;
    const cveHydrationPromises = new Map();
    const cveCardContexts = new Map();

    async function getOrInitCveStore() {
        if (cveStoreInitialized) return cveStore;
        if (cveStorePromise) return cveStorePromise;

        cveStorePromise = (async () => {
            try {
                const res = await fetchWithTimeout('assets/data/cves-local.json');
                if (!res.ok) {
                    throw new Error(`cves-local.json request failed: HTTP ${res.status}`);
                }
                const text = await res.text();
                try {
                    const data = JSON.parse(text);
                    if (Array.isArray(data)) {
                        data.forEach(item => {
                            if (item && item.cveMetadata && item.cveMetadata.cveId) {
                                cveStore[item.cveMetadata.cveId] = item;
                            }
                        });
                    } else if (data && data.dataType === "CVE_RECORD" && data.cveMetadata && data.cveMetadata.cveId) {
                        cveStore[data.cveMetadata.cveId] = data;
                    } else if (typeof data === 'object' && data !== null) {
                        Object.assign(cveStore, data);
                    }
                } catch (parseErr) {
                    // Fallback: Support concatenated multi-JSON objects (NDJSON / raw paste)
                    let depth = 0, start = -1, inString = false, escape = false;
                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        if (escape) { escape = false; continue; }
                        if (char === '\\') { escape = true; continue; }
                        if (char === '"') { inString = !inString; continue; }
                        if (!inString) {
                            if (char === '{') {
                                if (depth === 0) start = i;
                                depth++;
                            } else if (char === '}') {
                                depth--;
                                if (depth === 0 && start !== -1) {
                                    try {
                                        const item = JSON.parse(text.slice(start, i + 1));
                                        if (item && item.cveMetadata && item.cveMetadata.cveId) {
                                            cveStore[item.cveMetadata.cveId] = item;
                                        }
                                    } catch (e) { }
                                    start = -1;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                cveStorePromise = null;
                console.warn('Failed to load cves-local.json', e);
                return cveStore;
            }

            cveStoreInitialized = true;
            return cveStore;
        })();

        return cveStorePromise;
    }

    function makePlaceholderCveRecord(cveId) {
        return { cveMetadata: { cveId }, containers: {} };
    }

    function isValidCveId(cveId) {
        return /^CVE-\d{4}-\d{4,}$/.test(cveId);
    }

    function hasCveDetails(record) {
        return Boolean(
            record
            && record.containers
            && record.containers.cna
            && Object.keys(record.containers.cna).length > 0
        );
    }

    async function hydrateCveRecord(cveId) {
        const current = cveStore[cveId];
        if (hasCveDetails(current) || !isValidCveId(cveId)) {
            return current || null;
        }

        if (cveHydrationPromises.has(cveId)) {
            return cveHydrationPromises.get(cveId);
        }

        const request = (async () => {
            const apiUrl = `https://cveawg.mitre.org/api/cve/${cveId}`;
            const response = await fetchWithTimeout(apiUrl, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`MITRE request failed: HTTP ${response.status}`);
            }

            const json = await response.json();
            if (json?.cveMetadata?.cveId !== cveId) {
                throw new Error(`MITRE response ID mismatch for ${cveId}`);
            }

            cveStore[cveId] = json;
            return json;
        })();

        cveHydrationPromises.set(cveId, request);

        try {
            return await request;
        } finally {
            if (cveHydrationPromises.get(cveId) === request) {
                cveHydrationPromises.delete(cveId);
            }
        }
    }

    function createTextElement(tagName, className = '', text = '') {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        if (text !== null && text !== undefined) element.textContent = String(text);
        return element;
    }

    function appendIcon(element, iconClass) {
        const icon = document.createElement('i');
        icon.className = iconClass;
        element.appendChild(icon);
        return icon;
    }

    function getSafeHttpUrl(value) {
        if (!value) return null;
        try {
            const url = new URL(String(value), window.location.href);
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
        } catch (error) {
            return null;
        }
    }

    function createDetailBox(title, extraClass = '') {
        const box = createTextElement('div', `detail-box${extraClass ? ` ${extraClass}` : ''}`);
        box.appendChild(createTextElement('div', 'box-title', title));
        const content = createTextElement('div', 'box-content');
        box.appendChild(content);
        return { box, content };
    }

    function renderDetailView(container, record, cveId, finders = [], inlineItem = null) {
        const cna = record.containers && record.containers.cna ? record.containers.cna : {};
        const meta = record.cveMetadata || {};
        const hasCna = Object.keys(cna).length > 0;
        const isReserved = meta.state === 'RESERVED' || !hasCna;
        const title = cna.title || inlineItem?.title || (isReserved ? `${cveId} — Advisory Record Reserved` : (meta.cveId || cveId));
        const datePub = meta.datePublished ? new Date(meta.datePublished).toLocaleDateString() : (isReserved ? 'Pending Publication' : 'N/A');
        const assigner = meta.assignerShortName || (isReserved ? 'MITRE / CNA' : 'N/A');

        container.replaceChildren();

        const header = createTextElement('div', 'cve-detail-header');
        const backBtn = createTextElement('button', 'cve-back-btn');
        backBtn.type = 'button';
        backBtn.id = 'cve-back-btn';
        backBtn.setAttribute('aria-label', 'Back to CVE list');
        appendIcon(backBtn, 'fa-solid fa-arrow-left');
        backBtn.appendChild(document.createTextNode(' ALL CVES'));
        header.appendChild(backBtn);
        header.appendChild(createTextElement('h2', '', title));

        const metaTags = createTextElement('div', 'cve-meta-tags');
        metaTags.appendChild(createTextElement('span', 'cve-tag tag-id', meta.cveId || cveId));
        metaTags.appendChild(createTextElement('span', 'cve-tag tag-date', `Published: ${datePub}`));
        metaTags.appendChild(createTextElement('span', 'cve-tag tag-assigner', `Assigner: ${assigner}`));
        if (isReserved) {
            metaTags.appendChild(createTextElement('span', 'cve-tag tag-status badge-pending', 'STATUS: RESERVED'));
        }
        header.appendChild(metaTags);
        container.appendChild(header);

        const detailBody = createTextElement('div', 'cve-detail-body');
        const resolvedFinders = (finders || []).map(getFinderInfo).filter(Boolean);
        if (resolvedFinders.length > 0) {
            const { box, content } = createDetailBox('', 'cve-finders-box');
            const boxTitle = box.querySelector('.box-title');
            boxTitle.replaceChildren();
            appendIcon(boxTitle, 'fa-solid fa-award');
            boxTitle.appendChild(document.createTextNode(' Discovered By'));
            const grid = createTextElement('div', 'finders-grid');
            resolvedFinders.forEach(finder => {
                const finderCard = createTextElement('div', 'finder-card');
                const avatar = document.createElement('img');
                avatar.src = finder.avatar;
                avatar.className = 'finder-card-avatar';
                avatar.alt = finder.name;
                avatar.onerror = () => {
                    avatar.onerror = null;
                    avatar.src = '/assets/images/v1t.png';
                };
                const details = createTextElement('div', 'finder-card-details');
                details.appendChild(createTextElement('div', 'finder-card-name', finder.name));
                details.appendChild(createTextElement('div', 'finder-card-role', finder.role));
                finderCard.append(avatar, details);
                grid.appendChild(finderCard);
            });
            content.appendChild(grid);
            detailBody.appendChild(box);
        }

        if (inlineItem && inlineItem.target) {
            const { box, content } = createDetailBox('', 'cve-target-box');
            const boxTitle = box.querySelector('.box-title');
            boxTitle.replaceChildren();
            appendIcon(boxTitle, 'fa-solid fa-crosshairs');
            boxTitle.appendChild(document.createTextNode(' Target Scope'));
            content.appendChild(createTextElement('strong', '', inlineItem.target));
            detailBody.appendChild(box);
        }

        let descText = '';
        if (cna.descriptions && cna.descriptions[0] && cna.descriptions[0].value) {
            descText = cna.descriptions[0].value;
        } else if (inlineItem && inlineItem.description) {
            descText = inlineItem.description;
        } else if (isReserved) {
            descText = 'This CVE record is currently in the RESERVED state by MITRE / CNA. Technical specifics, impact vectors, and remediation advisories will automatically populate once public disclosure is completed by the coordinating CNA.';
        }

        if (descText) {
            const { box, content } = createDetailBox('Description');
            content.textContent = descText;
            detailBody.appendChild(box);
        }

        let allMetrics = [];
        if (cna.metrics) allMetrics = allMetrics.concat(cna.metrics);
        if (record.containers && record.containers.adp) {
            record.containers.adp.forEach(adp => {
                if (adp.metrics) allMetrics = allMetrics.concat(adp.metrics);
            });
        }

        const metricsContent = createTextElement('div');
        if (allMetrics.length > 0) {
            allMetrics.forEach(m => {
                const cvss = m.cvssV3_1 || m.cvssV3 || m.cvssV4_0;
                if (cvss) {
                    const rawSeverity = String(cvss.baseSeverity || '').toLowerCase();
                    const sevClass = ['critical', 'high', 'medium', 'low'].includes(rawSeverity) ? rawSeverity : 'unknown';
                    const score = cvss.baseScore ? `${cvss.baseScore} ` : '';
                    const metricItem = createTextElement('div', 'metric-item');
                    metricItem.appendChild(createTextElement('span', `metric-score badge-${sevClass}`, `${score}${cvss.baseSeverity || 'CVSS'}`));
                    if (cvss.vectorString) {
                        metricItem.appendChild(createTextElement('span', 'metric-vector', cvss.vectorString));
                    }
                    metricsContent.appendChild(metricItem);
                }
            });
        } else if (inlineItem && inlineItem.threat) {
            const sevClass = String(inlineItem.threat).toLowerCase();
            const metricItem = createTextElement('div', 'metric-item');
            metricItem.appendChild(createTextElement('span', `metric-score badge-${sevClass}`, `${inlineItem.threat} (Inline Assessment)`));
            metricsContent.appendChild(metricItem);
        }

        const weaknessContent = createTextElement('div');
        if (cna.problemTypes && cna.problemTypes[0] && cna.problemTypes[0].descriptions && cna.problemTypes[0].descriptions[0]) {
            const desc = cna.problemTypes[0].descriptions[0];
            const weakness = createTextElement('div', 'weakness-item');
            if (desc.cweId) {
                weakness.appendChild(createTextElement('strong', 'cwe-id-badge', desc.cweId));
                weakness.appendChild(document.createTextNode(' '));
            }
            weakness.appendChild(document.createTextNode(desc.description || ''));
            weaknessContent.appendChild(weakness);
        } else if (inlineItem && inlineItem.cwe) {
            const weakness = createTextElement('div', 'weakness-item');
            weakness.appendChild(createTextElement('strong', 'cwe-id-badge', inlineItem.cwe));
            weakness.appendChild(document.createTextNode(' (Inline)'));
            weaknessContent.appendChild(weakness);
        }

        if (metricsContent.childNodes.length || weaknessContent.childNodes.length) {
            const detailRow = createTextElement('div', 'detail-row');
            if (metricsContent.childNodes.length) {
                const { box, content } = createDetailBox('Metrics (CVSS)', 'flex-1');
                content.append(...metricsContent.childNodes);
                detailRow.appendChild(box);
            }
            if (weaknessContent.childNodes.length) {
                const { box, content } = createDetailBox('Weakness (CWE)', 'flex-1');
                content.append(...weaknessContent.childNodes);
                detailRow.appendChild(box);
            }
            detailBody.appendChild(detailRow);
        }

        if (cna.affected && cna.affected.length > 0) {
            const { box, content } = createDetailBox('Affected Products');
            const affectedList = createTextElement('ul', 'affected-list');
            cna.affected.forEach(affected => {
                const item = document.createElement('li');
                item.appendChild(createTextElement('strong', '', affected.vendor || 'Unknown'));
                item.appendChild(document.createTextNode(' / '));
                item.appendChild(createTextElement('span', '', affected.product || 'Unknown'));
                if (affected.versions && affected.versions.length > 0) {
                    const version = affected.versions[0];
                    if (version.lessThanOrEqual) {
                        item.appendChild(document.createTextNode(' '));
                        item.appendChild(createTextElement('span', 'version-badge', `<= ${version.lessThanOrEqual}`));
                    } else if (version.version && version.version !== 'unspecified') {
                        item.appendChild(document.createTextNode(' '));
                        item.appendChild(createTextElement('span', 'version-badge', `v${version.version}`));
                    }
                }
                affectedList.appendChild(item);
            });
            content.appendChild(affectedList);
            detailBody.appendChild(box);
        }

        if (cna.solutions && cna.solutions[0] && cna.solutions[0].value) {
            const { box, content } = createDetailBox('Solution');
            content.textContent = cna.solutions[0].value;
            detailBody.appendChild(box);
        }

        const referenceList = createTextElement('ul', 'ref-list');
        if (cna.references && cna.references.length > 0) {
            cna.references.forEach(reference => {
                const safeUrl = getSafeHttpUrl(reference.url);
                if (!safeUrl) return;
                const item = document.createElement('li');
                const link = createTextElement('a', '', reference.url);
                link.href = safeUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                item.appendChild(link);
                referenceList.appendChild(item);
            });
        }
        if (isValidCveId(cveId)) {
            [
                [`https://www.cve.org/CVERecord?id=${encodeURIComponent(cveId)}`, `Official MITRE CVE Record (${cveId})`],
                [`https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cveId)}`, `NIST National Vulnerability Database (${cveId})`]
            ].forEach(([href, label]) => {
                const item = document.createElement('li');
                const link = document.createElement('a');
                link.href = href;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                appendIcon(link, 'fa-solid fa-arrow-up-right-from-square');
                link.appendChild(document.createTextNode(` ${label}`));
                item.appendChild(link);
                referenceList.appendChild(item);
            });
        }

        if (referenceList.childNodes.length) {
            const { box, content } = createDetailBox('References & Verification');
            content.appendChild(referenceList);
            detailBody.appendChild(box);
        }

        container.appendChild(detailBody);

        const rawJson = JSON.stringify(record, null, 2);
        const rawContainer = createTextElement('div', 'cve-raw-json');
        const rawHeader = createTextElement('div', 'raw-header');
        rawHeader.appendChild(createTextElement('span', '', 'Raw JSON Data'));
        const copyBtn = createTextElement('button', 'copy-json-btn', 'Copy');
        copyBtn.type = 'button';
        rawHeader.appendChild(copyBtn);
        const pre = document.createElement('pre');
        const code = createTextElement('code', '', rawJson);
        code.id = 'raw-json-content';
        pre.appendChild(code);
        rawContainer.append(rawHeader, pre);
        container.appendChild(rawContainer);

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(rawJson).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });

        backBtn.addEventListener('click', () => {
            const modal = document.getElementById('cve-modal');
            if (modal) modal.classList.remove('split-mode');
            document.querySelectorAll('.cve-card.active').forEach(c => c.classList.remove('active'));
        });
    }

    function getSeverityClass(record, inlineItem = null) {
        let cardMetrics = [];
        if (record && record.containers && record.containers.cna && record.containers.cna.metrics) {
            cardMetrics = cardMetrics.concat(record.containers.cna.metrics);
        }
        if (record && record.containers && record.containers.adp) {
            record.containers.adp.forEach(adp => {
                if (adp.metrics) cardMetrics = cardMetrics.concat(adp.metrics);
            });
        }

        if (cardMetrics.length > 0) {
            for (const m of cardMetrics) {
                const cvss = m.cvssV3_1 || m.cvssV3 || m.cvssV4_0;
                if (cvss && cvss.baseSeverity) {
                    const s = String(cvss.baseSeverity).toUpperCase();
                    if (s === 'CRITICAL') return 'severity-critical';
                    if (s === 'HIGH') return 'severity-high';
                    if (s === 'MEDIUM') return 'severity-medium';
                    if (s === 'LOW') return 'severity-low';
                }
            }
        }

        // Inline threat fallback from cves-list.json (Trường hợp 1)
        if (inlineItem && inlineItem.threat) {
            const s = String(inlineItem.threat).toUpperCase();
            if (s === 'CRITICAL') return 'severity-critical';
            if (s === 'HIGH') return 'severity-high';
            if (s === 'MEDIUM') return 'severity-medium';
            if (s === 'LOW') return 'severity-low';
        }

        // If CVE is reserved or awaiting publication
        const isReserved = record && ((record.cveMetadata && record.cveMetadata.state === 'RESERVED') || (!record.containers || !record.containers.cna || Object.keys(record.containers.cna).length === 0));
        if (isReserved) {
            return 'severity-pending';
        }

        return '';
    }

    function makeCveCardElement(cveId, record, finders = [], inlineItem = null) {
        const container = document.createElement('button');
        container.type = 'button';
        container.className = 'cve-card';
        container.setAttribute('aria-controls', 'cve-detail-view');
        container.setAttribute('aria-expanded', 'false');
        container.setAttribute('aria-label', `View details for ${cveId}`);

        // Determine severity class based on local data if available
        const severityClass = getSeverityClass(record, inlineItem);
        if (severityClass) container.classList.add(severityClass);

        const idEl = document.createElement('div');
        idEl.className = 'cve-id';
        idEl.textContent = record.cveMetadata && record.cveMetadata.cveId ? record.cveMetadata.cveId : cveId;
        container.appendChild(idEl);

        // Finder Avatars on Card
        const resolvedFinders = (finders || []).map(getFinderInfo).filter(Boolean);
        if (resolvedFinders.length > 0) {
            const findersEl = document.createElement('div');
            findersEl.className = 'cve-card-finders';
            resolvedFinders.forEach(f => {
                const img = document.createElement('img');
                img.className = 'finder-avatar';
                img.src = f.avatar;
                img.alt = f.name;
                img.title = `Finder: ${f.name} (${f.role})`;
                img.loading = 'lazy';
                img.onerror = () => { img.src = '/assets/images/v1t.png'; };
                findersEl.appendChild(img);
            });
            container.appendChild(findersEl);
        }

        // Hover popup
        const popup = document.createElement('div');
        popup.className = 'cve-popup';
        document.body.appendChild(popup);

        function updateAndShowPopup() {
            // Don't show popup if in split mode
            const modal = document.getElementById('cve-modal');
            if (modal && modal.classList.contains('split-mode')) return;

            try {
                // Direct access from RAM store - instant, 0 network fetch
                const fresh = cveStore[cveId] || record || makePlaceholderCveRecord(cveId);
                const hasCna = fresh.containers && fresh.containers.cna && Object.keys(fresh.containers.cna).length > 0;
                const isReserved = (fresh.cveMetadata && fresh.cveMetadata.state === 'RESERVED') || !hasCna;

                let baseScore = '';
                let baseSeverity = '';
                let vectorString = '';
                let cwe = '';
                let title = '';
                let desc = '';

                if (hasCna) {
                    const cna = fresh.containers.cna;
                    title = cna.title || '';

                    let popupMetrics = [];
                    if (cna.metrics) popupMetrics = popupMetrics.concat(cna.metrics);
                    if (fresh.containers.adp) {
                        fresh.containers.adp.forEach(adp => {
                            if (adp.metrics) popupMetrics = popupMetrics.concat(adp.metrics);
                        });
                    }

                    if (popupMetrics.length > 0) {
                        for (const m of popupMetrics) {
                            const cvss = m.cvssV3_1 || m.cvssV3 || m.cvssV4_0;
                            if (cvss) {
                                baseScore = cvss.baseScore || '';
                                baseSeverity = cvss.baseSeverity || '';
                                vectorString = cvss.vectorString || '';
                                break;
                            }
                        }
                    }

                    // Extract CWE ID from CNA or ADP
                    let allProblemTypes = [];
                    if (cna.problemTypes) allProblemTypes = allProblemTypes.concat(cna.problemTypes);
                    if (fresh.containers.adp) {
                        fresh.containers.adp.forEach(adp => {
                            if (adp.problemTypes) allProblemTypes = allProblemTypes.concat(adp.problemTypes);
                        });
                    }

                    for (const pt of allProblemTypes) {
                        if (pt.descriptions && pt.descriptions.length > 0) {
                            const d = pt.descriptions[0];
                            if (d.cweId) {
                                cwe = d.cweId;
                                break;
                            } else if (d.description && d.description.toUpperCase().startsWith('CWE-')) {
                                const match = d.description.match(/(CWE-\d+)/i);
                                if (match) {
                                    cwe = match[1].toUpperCase();
                                    break;
                                }
                            }
                        }
                    }

                    if (cna.descriptions && cna.descriptions[0] && cna.descriptions[0].value) {
                        desc = cna.descriptions[0].value;
                    }
                }

                // Fallbacks from inline item (Trường hợp 1)
                if (!title) {
                    title = inlineItem?.title || (isReserved ? `${cveId} (Reserved / Pending)` : cveId);
                }
                if (!cwe) {
                    cwe = inlineItem?.cwe || (isReserved ? 'RESERVED' : 'N/A');
                }
                if (!desc) {
                    if (inlineItem?.description) {
                        desc = inlineItem.description;
                    } else if (inlineItem?.target) {
                        desc = `Target: ${inlineItem.target}. Advisory details pending disclosure.`;
                    } else if (isReserved) {
                        desc = 'CVE ID officially reserved. Technical impact details are awaiting public release by MITRE/CNA.';
                    } else {
                        desc = 'No description available.';
                    }
                }

                popup.replaceChildren();
                popup.appendChild(createTextElement('div', 'title', title));

                if (resolvedFinders.length > 0) {
                    const popupFinders = createTextElement('div', 'cve-popup-finders');
                    const findersLabel = createTextElement('span', 'finders-label');
                    appendIcon(findersLabel, 'fa-solid fa-user-shield');
                    findersLabel.appendChild(document.createTextNode(' Finder:'));
                    popupFinders.appendChild(findersLabel);

                    const findersChips = createTextElement('div', 'finders-chips');
                    resolvedFinders.forEach(finder => {
                        const chip = createTextElement('span', 'finder-chip');
                        chip.title = finder.role;
                        const avatar = document.createElement('img');
                        avatar.src = finder.avatar;
                        avatar.className = 'finder-chip-avatar';
                        avatar.alt = finder.name;
                        avatar.onerror = () => {
                            avatar.onerror = null;
                            avatar.src = '/assets/images/v1t.png';
                        };
                        chip.append(avatar, createTextElement('span', 'finder-chip-name', finder.name));
                        findersChips.appendChild(chip);
                    });
                    popupFinders.appendChild(findersChips);
                    popup.appendChild(popupFinders);
                }

                const metrics = createTextElement('div', 'cwe-metrics');
                metrics.appendChild(createTextElement('span', 'cwe', cwe));
                if (baseScore !== '' || baseSeverity !== '') {
                    const scoreText = [baseScore, baseSeverity].filter(Boolean).join(' | ');
                    metrics.appendChild(createTextElement('span', 'severity-badge', scoreText));
                } else if (inlineItem?.threat) {
                    const rawThreat = String(inlineItem.threat).toLowerCase();
                    const threatClass = ['critical', 'high', 'medium', 'low'].includes(rawThreat) ? rawThreat : 'pending';
                    metrics.appendChild(createTextElement('span', `severity-badge badge-${threatClass}`, inlineItem.threat));
                } else if (isReserved) {
                    metrics.appendChild(createTextElement('span', 'severity-badge badge-pending', 'PENDING'));
                }
                popup.appendChild(metrics);
                popup.appendChild(createTextElement('div', 'desc', desc));
                if (vectorString) {
                    popup.appendChild(createTextElement('div', 'cvss', vectorString));
                }
            } catch (err) {
                console.warn('Failed to refresh popup content', cveId, err);
            }

            popup.style.display = 'block';
            popup.style.visibility = 'hidden';

            const vw = document.documentElement.clientWidth;
            const vh = document.documentElement.clientHeight;

            const popupWidth = Math.min(420, vw * 0.92);
            popup.style.width = popupWidth + 'px';

            const _ = popup.offsetHeight; // force reflow
            const rect = container.getBoundingClientRect();

            let left = Math.round(rect.left + rect.width / 2 - popupWidth / 2);
            left = Math.max(8, Math.min(left, vw - popupWidth - 8));

            let top = Math.round(rect.top - popup.offsetHeight - 12);

            // If it spills off the top, try putting it below the card
            if (top < 8) {
                top = Math.round(rect.bottom + 12);
            }

            // If it spills off the bottom, force it inside the screen
            if (top + popup.offsetHeight > vh - 8) {
                top = vh - popup.offsetHeight - 8;
            }

            // If the popup is extremely tall and still spills off the top, clamp to top
            if (top < 8) {
                top = 8;
            }

            popup.style.left = left + 'px';
            popup.style.top = top + 'px';
            popup.style.visibility = 'visible';
        }

        function hidePopup() {
            popup.style.display = 'none';
        }

        container.addEventListener('mouseenter', updateAndShowPopup);
        container.addEventListener('mouseleave', hidePopup);
        container.addEventListener('focus', updateAndShowPopup);
        container.addEventListener('blur', hidePopup);

        container.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            hidePopup();

            const modal = document.getElementById('cve-modal');
            const isActive = container.classList.contains('active');

            // Remove active from all cards
            document.querySelectorAll('.cve-card').forEach(card => {
                card.classList.remove('active');
                card.setAttribute('aria-expanded', 'false');
            });

            if (isActive) {
                // If it was already active, we are closing it
                if (modal) modal.classList.remove('split-mode');
                if (isStandalonePage) history.replaceState(null, '', window.location.pathname);
            } else {
                // Otherwise, mark this one active and open split mode
                container.classList.add('active');
                container.setAttribute('aria-expanded', 'true');
                if (modal) modal.classList.add('split-mode');
                if (isStandalonePage) history.replaceState(null, '', '#' + cveId);

                const detailView = document.getElementById('cve-detail-view');
                if (detailView) {
                    const current = cveStore[cveId] || record;
                    const hasData = hasCveDetails(current);

                    if (hasData) {
                        // 1. Data exists in RAM - Instant render with 0 fetch
                        renderDetailView(detailView, current, cveId, finders, inlineItem);
                    } else if (isValidCveId(cveId)) {
                        // 2. Keep the fallback visible while reusing the list-level hydration request.
                        renderDetailView(detailView, current || makePlaceholderCveRecord(cveId), cveId, finders, inlineItem);
                        try {
                            const json = await hydrateCveRecord(cveId);
                            if (!json) return;
                            if (container.classList.contains('active')) {
                                renderDetailView(detailView, json, cveId, finders, inlineItem);
                            }
                            const sevClass = getSeverityClass(json, inlineItem);
                            if (sevClass) {
                                container.classList.remove('severity-pending');
                                container.classList.add(sevClass);
                            }
                        } catch (e) {
                            console.warn(`Failed to hydrate ${cveId}`, e);
                        }
                    } else {
                        renderDetailView(detailView, current || makePlaceholderCveRecord(cveId), cveId, finders, inlineItem);
                    }
                }
            }
        });

        return container;
    }

    function applyHydratedCveRecord(cveId, record) {
        const context = cveCardContexts.get(cveId);
        if (!context || !record) return;

        const { card, finders, inlineItem } = context;
        const severityClass = getSeverityClass(record, inlineItem);
        if (severityClass) {
            card.classList.remove('severity-pending');
            card.classList.add(severityClass);
        }

        if (card.classList.contains('active')) {
            const detailView = document.getElementById('cve-detail-view');
            if (detailView) {
                renderDetailView(detailView, record, cveId, finders, inlineItem);
            }
        }

        if (cveSortMode === 'severity-desc') {
            applyCveGridFilters();
        }
    }

    function hydrateMissingCveCards() {
        cveCardContexts.forEach((context, cveId) => {
            if (hasCveDetails(cveStore[cveId]) || !isValidCveId(cveId)) return;

            hydrateCveRecord(cveId)
                .then(record => applyHydratedCveRecord(cveId, record))
                .catch(error => console.warn(`Failed to hydrate ${cveId}`, error));
        });
    }

    async function renderCveGrid() {
        // Remove old popups to prevent DOM bloat and memory leaks
        document.querySelectorAll('.cve-popup').forEach(p => p.remove());

        const grid = document.getElementById('cve-grid');
        if (!grid) return false;
        grid.innerHTML = '';

        // Fetch all files ONCE and cache in RAM
        const [listItems, store] = await Promise.all([
            loadCveList(),
            getOrInitCveStore(),
            loadMembersData()
        ]);
        if (!listItems.length) return false;

        const findersMap = {};
        listItems.forEach(item => {
            if (item && item.id) {
                if (!findersMap[item.id]) findersMap[item.id] = [];
                if (item.finders && item.finders.length > 0) {
                    findersMap[item.id] = findersMap[item.id].concat(item.finders);
                }
            }
        });

        // Also check if any item in store has finders
        Object.keys(store).forEach(id => {
            if (!findersMap[id]) findersMap[id] = [];
            const rec = store[id];
            if (rec && rec.finders) {
                findersMap[id] = findersMap[id].concat(rec.finders);
            }
        });

        cveCardContexts.clear();
        cveGridItems = listItems;
        renderCveFilterControls(listItems);

        // Render ONLY items defined in cves-list.json (Single Source of Truth)
        for (const item of listItems) {
            const id = item.id;
            const record = store[id] || store[id.toLowerCase()] || makePlaceholderCveRecord(id);
            store[id] = record;
            const finders = item.finders && item.finders.length > 0 ? item.finders : (findersMap[id] || []);
            const cardEl = makeCveCardElement(id, record, finders, item);
            cveCardContexts.set(id, { card: cardEl, finders, inlineItem: item });
            grid.appendChild(cardEl);
        }

        applyCveGridFilters();

        // Start live hydration as soon as the list opens, including RESERVED records.
        // The list remains interactive while requests run in the background.
        hydrateMissingCveCards();
        return true;
    }

    // Article button: navigate to articles/ when clicked (keeps semantic button element)
    const showArticlesBtn = document.getElementById('show-articles');
    if (showArticlesBtn) {
        showArticlesBtn.addEventListener('click', () => {
            const href = showArticlesBtn.dataset.href || 'articles/';
            window.location.href = href;
        });
    }

    function closeModal() {
        if (!modal) return;
        if (isStandalonePage) {
            window.location.href = '/';
            return;
        }
        modal.hidden = true;
        document.body.classList.remove('cve-modal-open');
        modal.classList.remove('split-mode');
        const finderMenu = document.getElementById('cve-finder-menu');
        const finderTrigger = document.getElementById('cve-finder-trigger');
        if (finderMenu) finderMenu.hidden = true;
        if (finderTrigger) finderTrigger.setAttribute('aria-expanded', 'false');
        document.querySelector('.cve-finder-field')?.classList.remove('is-open');
        document.querySelectorAll('.cve-card.active').forEach(card => {
            card.classList.remove('active');
            card.setAttribute('aria-expanded', 'false');
        });
        document.querySelectorAll('.cve-popup').forEach(p => { p.style.display = 'none'; });
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
        }
        lastFocusedElement = null;
    }

    if (closeBtn && modal) closeBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal || (e.target && e.target.classList && e.target.classList.contains('cve-modal-backdrop'))) {
                closeModal();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (modal.hidden) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
                return;
            }
            trapModalFocus(e);
        });

    if (isStandalonePage && modal) {
        openCveModal({ focusClose: false });
    }
    }

    // Expose debug helpers to window for easier console testing
    try {
        window.debugCves = {
            store: cveStore,
            getStore: getOrInitCveStore,
            renderCveGrid: async () => { const rendered = await renderCveGrid(); console.log('renderCveGrid done', rendered); }
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

    /* ========================================================
       CYBER POD: CISA KEV RADAR (INFINITY AUTO SLIDER) & CLIENT FINGERPRINT (IFCONFIG.NET SPEC)
       ======================================================== */
    function initCyberPod() {
        const pod = document.getElementById('stage-cyber-pod');
        if (!pod) return;

        const tabKev = document.getElementById('tab-kev');
        const tabTrace = document.getElementById('tab-trace');
        const channelGlider = document.getElementById('channel-glider');
        const viewsCarousel = document.getElementById('pod-views-carousel');
        const statusLiveStream = document.getElementById('status-live-stream');
        const headerTraceActions = document.getElementById('header-trace-actions');
        const carouselViewport = document.getElementById('pod-carousel-viewport');
        const podCollapseBtn = document.getElementById('pod-collapse-btn');
        const podHeaderBar = document.getElementById('pod-header-bar');

        function expandMobilePod(targetTab) {
            if (window.innerWidth > 768) return;
            if (!pod.classList.contains('mobile-expanded')) {
                pod.classList.add('mobile-expanded');
                if (targetTab) {
                    switchTab(targetTab);
                }
                if (!kevList || !kevList.length) {
                    loadKevData();
                } else {
                    renderKevMarquee();
                }
                setTimeout(() => {
                    updateGroupHeight();
                    currentScroll = 0;
                    applyTransform();
                    resumeKevMarquee();
                    if (tabTrace && tabTrace.classList.contains('active')) {
                        runClientTrace();
                    }
                    const activeTab = tabTrace && tabTrace.classList.contains('active') ? tabTrace : tabKev;
                    updateChannelGlider(activeTab);
                }, 60);
            }
        }

        function collapseMobilePod() {
            if (window.innerWidth <= 768 && pod.classList.contains('mobile-expanded')) {
                pod.classList.remove('mobile-expanded');
                pauseKevMarquee();
                setTimeout(() => {
                    const activeTab = tabTrace && tabTrace.classList.contains('active') ? tabTrace : tabKev;
                    updateChannelGlider(activeTab);
                }, 50);
            }
        }

        // On mobile: tapping the button expands the pod
        if (pod) {
            pod.addEventListener('click', (e) => {
                if (window.innerWidth > 768) return;
                if (!pod.classList.contains('mobile-expanded')) {
                    const clickedTab = e.target.closest('.channel-tab');
                    const target = clickedTab ? clickedTab.getAttribute('data-tab') : (tabTrace && tabTrace.classList.contains('active') ? 'trace' : 'kev');
                    expandMobilePod(target);
                }
            });
        }

        if (podCollapseBtn) {
            podCollapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                collapseMobilePod();
            });
        }

        function updateChannelGlider(activeTab) {
            if (!channelGlider || !activeTab) return;
            const tabRect = activeTab.getBoundingClientRect();
            const navRect = activeTab.parentElement ? activeTab.parentElement.getBoundingClientRect() : null;
            if (tabRect.width > 0 && navRect && navRect.width > 0) {
                const left = tabRect.left - navRect.left;
                const width = tabRect.width;
                channelGlider.style.left = `${left}px`;
                channelGlider.style.width = `${width}px`;
            }
        }

        // Minimalist Dual-Channel Switcher
        function switchTab(target) {
            if (target === 'trace') {
                if (tabKev) {
                    tabKev.classList.remove('active');
                    tabKev.setAttribute('aria-selected', 'false');
                }
                if (tabTrace) {
                    tabTrace.classList.add('active');
                    tabTrace.setAttribute('aria-selected', 'true');
                    updateChannelGlider(tabTrace);
                }
                if (viewsCarousel) viewsCarousel.setAttribute('data-active', 'trace');
                if (statusLiveStream) statusLiveStream.style.display = 'none';
                if (headerTraceActions) headerTraceActions.style.display = 'flex';
                pauseKevMarquee();
                runClientTrace();
            } else {
                if (tabTrace) {
                    tabTrace.classList.remove('active');
                    tabTrace.setAttribute('aria-selected', 'false');
                }
                if (tabKev) {
                    tabKev.classList.add('active');
                    tabKev.setAttribute('aria-selected', 'true');
                    updateChannelGlider(tabKev);
                }
                if (viewsCarousel) viewsCarousel.removeAttribute('data-active');
                if (statusLiveStream) statusLiveStream.style.display = 'inline-flex';
                resumeKevMarquee();
            }
        }

        if (tabKev) tabKev.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !pod.classList.contains('mobile-expanded')) {
                expandMobilePod('kev');
                return;
            }
            switchTab('kev');
        });
        if (tabTrace) tabTrace.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !pod.classList.contains('mobile-expanded')) {
                expandMobilePod('trace');
                return;
            }
            switchTab('trace');
        });

        // Horizontal Swipe Gestures on Carousel
        if (carouselViewport) {
            let touchStartX = 0;
            let touchStartY = 0;
            carouselViewport.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            carouselViewport.addEventListener('touchend', (e) => {
                if (e.changedTouches.length === 1) {
                    const dx = e.changedTouches[0].clientX - touchStartX;
                    const dy = e.changedTouches[0].clientY - touchStartY;
                    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                        if (dx < 0) {
                            switchTab('trace');
                        } else {
                            switchTab('kev');
                        }
                    }
                }
            }, { passive: true });
        }

        // ========================================================
        // 1. CISA KEV RADAR INTERACTIVE INFINITY MARQUEE MODULE
        // ========================================================
        let kevList = [];
        const marqueeTrack = document.getElementById('kev-marquee-track');
        const sliderViewport = document.getElementById('kev-slider-viewport');
        const group1 = document.getElementById('kev-group-1');
        const group2 = document.getElementById('kev-group-2');

        let currentScroll = 0;
        let groupHeight = 0;
        let isHovered = false;
        let isTabActive = true;
        let isMouseDown = false;
        let hasDragged = false;
        let startY = 0;
        let startScroll = 0;
        let lastFrameTime = performance.now();
        const SCROLL_SPEED = 28; // pixels per second

        function updateGroupHeight() {
            if (group1 && group1.offsetHeight > 0) {
                groupHeight = group1.offsetHeight;
            }
        }

        function applyTransform() {
            if (!marqueeTrack) return;
            marqueeTrack.style.transform = `translateY(-${currentScroll}px)`;
        }

        function loopScrollBounds() {
            if (groupHeight <= 0) updateGroupHeight();
            if (groupHeight > 0) {
                while (currentScroll >= groupHeight) currentScroll -= groupHeight;
                while (currentScroll < 0) currentScroll += groupHeight;
            } else {
                currentScroll = 0;
            }
        }

        let isTouching = false;
        let momentumAnimationId = null;
        let autoResumeTimer = null;
        let isManualPaused = false;

        function stopMomentum() {
            if (momentumAnimationId) {
                cancelAnimationFrame(momentumAnimationId);
                momentumAnimationId = null;
            }
        }

        function clearAutoResumeTimer() {
            if (autoResumeTimer) {
                clearTimeout(autoResumeTimer);
                autoResumeTimer = null;
            }
        }

        function updateHintDisplay() {
            const hintEl = sliderViewport ? sliderViewport.parentElement.querySelector('.kev-hover-hint') : null;
            if (!hintEl) return;
            if (window.innerWidth <= 768) {
                if (isManualPaused) {
                    hintEl.innerHTML = '<span style="color:var(--accent-orange,#FF6D00);font-weight:700">⏸ PAUSED</span> • Tap to play';
                } else {
                    hintEl.textContent = 'Swipe to scroll • Tap to pause';
                }
            } else {
                hintEl.textContent = 'Scroll / Drag • Hover pauses';
            }
        }

        function scheduleAutoResume(delayMs = 3200) {
            clearAutoResumeTimer();
            if (isManualPaused) return;
            autoResumeTimer = setTimeout(() => {
                if (!isTouching && !momentumAnimationId && !isMouseDown) {
                    isHovered = false;
                    lastFrameTime = performance.now();
                    updateHintDisplay();
                }
            }, delayMs);
        }

        // Animation frame loop
        function marqueeTick(now) {
            const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
            lastFrameTime = now;

            if (isTabActive && !isHovered && !isMouseDown && !isTouching && !momentumAnimationId && !isManualPaused && kevList.length > 0) {
                if (groupHeight <= 0) updateGroupHeight();
                if (groupHeight > 0) {
                    currentScroll += SCROLL_SPEED * dt;
                    loopScrollBounds();
                    applyTransform();
                }
            }

            requestAnimationFrame(marqueeTick);
        }
        requestAnimationFrame(marqueeTick);

        function createKevCard(item) {
            const card = document.createElement('div');
            card.className = 'kev-slide-card';

            const id = item.cveID || item.id || 'CVE-2024-XXXX';
            const threat = item.threatLevel || (item.knownRansomwareCampaignUse === 'Known' ? 'CRITICAL' : 'HIGH');
            const vendor = item.vendorProject || 'Vendor';
            const product = item.product || 'System';
            const desc = item.shortDescription || item.vulnerabilityName || 'In-the-wild exploitation detected.';
            const isRansom = item.knownRansomwareCampaignUse === 'Known';
            const date = item.dateAdded ? item.dateAdded : 'Active Status';
            const cwes = Array.isArray(item.cwes) && item.cwes.length
                ? item.cwes.join(', ')
                : (typeof item.cwes === 'string' && item.cwes.trim() ? item.cwes.trim() : (item.cwe || 'CWE-N/A'));

            const head = createTextElement('div', 'kev-card-head');
            const link = createTextElement('a', 'kev-cve-link', id);
            link.href = `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(id)}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            head.append(link, createTextElement('span', 'kev-threat-pill', threat));

            const footer = createTextElement('div', 'kev-card-footer');
            footer.append(
                createTextElement('span', '', cwes),
                createTextElement('span', '', date)
            );

            card.append(
                head,
                createTextElement('div', 'kev-target-line', `${vendor} • ${product}`),
                createTextElement('div', 'kev-desc-line', desc),
                footer
            );
            return card;
        }

        function renderKevMarquee() {
            if (!group1 || !group2 || !kevList.length) return;
            group1.replaceChildren();
            group2.replaceChildren();

            kevList.forEach(item => {
                group1.appendChild(createKevCard(item));
                group2.appendChild(createKevCard(item));
            });

            requestAnimationFrame(() => {
                updateGroupHeight();
            });
        }

        function pauseKevMarquee() {
            isTabActive = false;
            stopMomentum();
            clearAutoResumeTimer();
        }

        function resumeKevMarquee() {
            isTabActive = true;
            isManualPaused = false;
            isHovered = false;
            stopMomentum();
            clearAutoResumeTimer();
            lastFrameTime = performance.now();
            updateGroupHeight();
            loopScrollBounds();
            applyTransform();
            updateHintDisplay();
        }


        // --- Interaction Handlers: Hover, Wheel, Drag & Touch ---
        if (sliderViewport) {
            updateHintDisplay();
            window.addEventListener('resize', updateHintDisplay);

            // Hover: pause auto-scroll
            sliderViewport.addEventListener('mouseenter', () => {
                isHovered = true;
                updateGroupHeight();
            });

            sliderViewport.addEventListener('mouseleave', () => {
                if (!isMouseDown && !isTouching) {
                    if (!isManualPaused) {
                        isHovered = false;
                    }
                    lastFrameTime = performance.now();
                }
            });

            // Wheel: user can freely scroll up/down with mouse wheel / trackpad!
            sliderViewport.addEventListener('wheel', (e) => {
                e.preventDefault();
                isHovered = true;
                updateGroupHeight();
                currentScroll += e.deltaY * 0.75;
                loopScrollBounds();
                applyTransform();
            }, { passive: false });

            // Drag to scroll
            sliderViewport.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; // Only left button
                isMouseDown = true;
                hasDragged = false;
                startY = e.clientY;
                startScroll = currentScroll;
                updateGroupHeight();
            });

            window.addEventListener('mousemove', (e) => {
                if (!isMouseDown) return;
                const dy = e.clientY - startY;
                if (Math.abs(dy) > 4) {
                    hasDragged = true;
                }
                currentScroll = startScroll - dy;
                loopScrollBounds();
                applyTransform();
            });

            window.addEventListener('mouseup', () => {
                if (isMouseDown) {
                    isMouseDown = false;
                    if (!sliderViewport.matches(':hover') && !isManualPaused) {
                        isHovered = false;
                    }
                    lastFrameTime = performance.now();
                    setTimeout(() => { hasDragged = false; }, 60);
                }
            });

            // Prevent link click if the user was dragging
            sliderViewport.addEventListener('click', (e) => {
                if (hasDragged) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);

            // Mobile Touch support with Momentum Physics & Reading Pause
            let touchStartY = 0;
            let touchStartX = 0;
            let touchStartScroll = 0;
            let touchPoints = [];

            sliderViewport.addEventListener('touchstart', (e) => {
                if (e.touches.length !== 1) return;
                stopMomentum();
                clearAutoResumeTimer();

                isTouching = true;
                isHovered = true;
                hasDragged = false;

                const touch = e.touches[0];
                touchStartY = touch.clientY;
                touchStartX = touch.clientX;
                touchStartScroll = currentScroll;
                touchPoints = [{ y: touch.clientY, time: performance.now() }];

                updateGroupHeight();
            }, { passive: true });

            sliderViewport.addEventListener('touchmove', (e) => {
                if (!isTouching || e.touches.length !== 1) return;
                const touch = e.touches[0];
                const dy = touch.clientY - touchStartY;
                const dx = touch.clientX - touchStartX;

                // Vertical swipe gesture
                if (Math.abs(dy) >= Math.abs(dx)) {
                    if (Math.abs(dy) > 5) {
                        hasDragged = true;
                    }
                    // Prevent page scroll when swiping inside KEV
                    if (e.cancelable) {
                        e.preventDefault();
                    }
                    currentScroll = touchStartScroll - dy;
                    loopScrollBounds();
                    applyTransform();

                    const now = performance.now();
                    touchPoints.push({ y: touch.clientY, time: now });
                    while (touchPoints.length > 1 && (now - touchPoints[0].time) > 100) {
                        touchPoints.shift();
                    }
                } else if (Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) > 50) {
                    // Swipe left to switch to TRACE tab
                    if (dx < -50 && tabTrace) {
                        hasDragged = true;
                        switchTab('trace');
                        isTouching = false;
                    }
                }
            }, { passive: false });

            sliderViewport.addEventListener('touchend', (e) => {
                if (!isTouching) return;
                isTouching = false;

                const now = performance.now();

                if (hasDragged && touchPoints.length >= 2) {
                    const first = touchPoints[0];
                    const last = touchPoints[touchPoints.length - 1];
                    const dt = Math.max(last.time - first.time, 1);
                    const dy = last.y - first.y;

                    // Launch momentum if touch moved recently (< 80ms)
                    if (dt > 10 && (now - last.time) < 80) {
                        let velocity = -(dy / dt) * 1000;
                        const MAX_V = 2400;
                        velocity = Math.max(-MAX_V, Math.min(MAX_V, velocity));

                        if (Math.abs(velocity) > 60) {
                            let lastT = performance.now();
                            function runMomentum(t) {
                                const delta = Math.min((t - lastT) / 1000, 0.05);
                                lastT = t;

                                currentScroll += velocity * delta;
                                loopScrollBounds();
                                applyTransform();

                                velocity *= Math.pow(0.93, delta * 60);

                                if (Math.abs(velocity) > 12 && !isTouching) {
                                    momentumAnimationId = requestAnimationFrame(runMomentum);
                                } else {
                                    momentumAnimationId = null;
                                    scheduleAutoResume(3200);
                                }
                            }
                            stopMomentum();
                            momentumAnimationId = requestAnimationFrame(runMomentum);
                            return;
                        }
                    }
                    scheduleAutoResume(3200);
                } else if (!hasDragged) {
                    // Tap on card or viewport (not link) toggles pause/play
                    const link = e.target.closest('.kev-cve-link');
                    if (!link) {
                        isManualPaused = !isManualPaused;
                        isHovered = isManualPaused;
                        updateHintDisplay();
                        if (!isManualPaused) {
                            lastFrameTime = performance.now();
                        }
                    }
                }

                if (hasDragged) {
                    setTimeout(() => { hasDragged = false; }, 120);
                }
            }, { passive: true });

            sliderViewport.addEventListener('touchcancel', () => {
                isTouching = false;
                stopMomentum();
                scheduleAutoResume(2000);
                setTimeout(() => { hasDragged = false; }, 60);
            });
        }

        // Fetch KEV data once: cache in sessionStorage for fast reuse
        async function loadKevData() {
            try {
                const cached = sessionStorage.getItem('v1t_cisa_kev_v2');
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed) && parsed.length) {
                            kevList = parsed;
                            renderKevMarquee();
                            return;
                        }
                    } catch (e) { }
                }

                // 1. Local fallback data
                try {
                    const localRes = await fetchWithTimeout('assets/data/cisa-kev.json');
                    if (!localRes.ok) throw new Error(`Local KEV request failed: HTTP ${localRes.status}`);
                    const localData = await localRes.json();
                    if (!Array.isArray(localData)) throw new Error('Local KEV data must be an array.');
                    kevList = localData;
                    sessionStorage.setItem('v1t_cisa_kev_v2', JSON.stringify(kevList));
                    renderKevMarquee();
                } catch (localError) {
                    console.warn('Local CISA KEV load notice:', localError);
                }

                // 2. Fetch fresh live feed from official CISA GitHub mirror (CORS enabled)
                fetchWithTimeout('https://raw.githubusercontent.com/cisagov/kev-data/main/known_exploited_vulnerabilities.json')
                    .then(res => {
                        if (!res.ok) throw new Error(`Live KEV request failed: HTTP ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        if (data && Array.isArray(data.vulnerabilities) && data.vulnerabilities.length) {
                            const fresh = data.vulnerabilities.slice(0, 12);
                            kevList = fresh;
                            sessionStorage.setItem('v1t_cisa_kev_v2', JSON.stringify(fresh));
                            renderKevMarquee();
                        }
                    })
                    .catch(() => { });
            } catch (err) {
                console.warn('CISA KEV load notice:', err);
            }
        }

        loadKevData();

        // ========================================================
        // 2. CLIENT FINGERPRINT (IFCONFIG.NET SPECIFICATION)
        // ========================================================
        let traceExecuted = false;
        let lastTracePayload = null;

        async function runClientTrace() {
            const traceIp = document.getElementById('trace-ip');
            const traceIpDecimal = document.getElementById('trace-ip-decimal');
            const traceCountry = document.getElementById('trace-country');
            const traceCity = document.getElementById('trace-city');
            const traceCoords = document.getElementById('trace-coords');
            const traceTz = document.getElementById('trace-tz');
            const traceAsnIsp = document.getElementById('trace-asn-isp');
            const traceUa = document.getElementById('trace-ua');
            const traceGpu = document.getElementById('trace-gpu');
            const traceDisplay = document.getElementById('trace-display');
            const tracePing = document.getElementById('trace-ping');
            const traceDefense = document.getElementById('trace-defense');

            // 1. Browser & Hardware Specs
            let gpuInfo = 'Standard GPU';
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) {
                        const rawGpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                        gpuInfo = rawGpu
                            .replace(/ANGLE \((.+)\)/, '$1')
                            .replace(/Direct3D.+/, '')
                            .replace(/vs_.+/, '')
                            .trim();
                        if (gpuInfo.length > 20) gpuInfo = gpuInfo.substring(0, 19) + '...';
                    }
                }
            } catch (e) { }

            const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency}C` : '';
            if (traceGpu) traceGpu.textContent = cores ? `${gpuInfo} (${cores})` : gpuInfo;

            // Display
            if (traceDisplay) {
                traceDisplay.textContent = `${window.screen.width}x${window.screen.height} (${window.screen.colorDepth}-bit)`;
            }

            // User Agent
            if (traceUa) {
                const ua = navigator.userAgent;
                let browserName = 'Browser';
                if (ua.includes('Chrome/')) browserName = 'Chrome';
                else if (ua.includes('Firefox/')) browserName = 'Firefox';
                else if (ua.includes('Safari/')) browserName = 'Safari';
                else if (ua.includes('Edg/')) browserName = 'Edge';

                let osName = 'OS';
                if (ua.includes('Windows')) osName = 'Windows';
                else if (ua.includes('Macintosh')) osName = 'macOS';
                else if (ua.includes('Linux')) osName = 'Linux';
                else if (ua.includes('Android')) osName = 'Android';
                else if (ua.includes('iPhone') || ua.includes('iPad')) osName = 'iOS';

                traceUa.textContent = `${osName} • ${browserName}`;
            }

            // 2. Measure Latency Ping
            const t0 = performance.now();
            try {
                await fetchWithTimeout('assets/images/V1t_fin.png?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
                const rtt = Math.round(performance.now() - t0);
                if (tracePing) tracePing.textContent = `${rtt}ms RTT • TLS 1.3`;
            } catch (e) {
                if (tracePing) tracePing.textContent = `~22ms (Direct)`;
            }

            // 3. Privacy Shield
            const dnt = navigator.doNotTrack === '1' || navigator.globalPrivacyControl;
            if (traceDefense) {
                traceDefense.textContent = dnt ? 'SHIELD ACTIVE' : 'MONITORED';
                traceDefense.className = `trace-val trace-defense-status ${dnt ? 'defense-high' : 'defense-std'}`;
            }

            // 4. Fetch Rich Ifconfig Data from ipwho.is (CORS enabled, full ifconfig.net fields)
            try {
                let data = null;
                const ipwhoRes = await fetchWithTimeout('https://ipwho.is/').catch(() => null);
                if (ipwhoRes && ipwhoRes.ok) {
                    data = await ipwhoRes.json();
                }

                if (data && data.success) {
                    const ip = data.ip || '127.0.0.1';
                    if (traceIp) traceIp.textContent = ip;

                    // IP Decimal calculation
                    const parts = ip.split('.').map(Number);
                    if (parts.length === 4) {
                        const dec = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
                        if (traceIpDecimal) traceIpDecimal.textContent = dec.toString();
                    }

                    const flag = (data.flag && data.flag.emoji) ? data.flag.emoji : '🌐';
                    const country = data.country || 'Unknown';
                    const countryCode = data.country_code || '';
                    if (traceCountry) traceCountry.textContent = `${country} (${countryCode}) ${flag}`;

                    const region = data.region || '';
                    const city = data.city || '';
                    if (traceCity) traceCity.textContent = city ? `${city}, ${region}` : (region || 'Unknown');

                    if (data.latitude && data.longitude) {
                        const lat = data.latitude.toFixed(3);
                        const lon = data.longitude.toFixed(3);
                        if (traceCoords) traceCoords.textContent = `${lat}°N, ${lon}°E`;
                    }

                    if (data.timezone && data.timezone.id) {
                        const tz = data.timezone.id;
                        const utc = data.timezone.utc ? ` (${data.timezone.utc})` : '';
                        if (traceTz) traceTz.textContent = `${tz}${utc}`;
                    }

                    const asn = (data.connection && data.connection.asn) ? `AS${data.connection.asn}` : '';
                    const isp = (data.connection && data.connection.isp) ? data.connection.isp : '';
                    if (traceAsnIsp) traceAsnIsp.textContent = (asn && isp) ? `${asn} • ${isp}` : (isp || asn || 'Unknown');

                    // Save payload for clipboard
                    lastTracePayload = {
                        ip: ip,
                        ip_decimal: traceIpDecimal ? traceIpDecimal.textContent : null,
                        country: country,
                        country_iso: countryCode,
                        city: city,
                        region: region,
                        coordinates: traceCoords ? traceCoords.textContent : null,
                        time_zone: traceTz ? traceTz.textContent : null,
                        asn: asn,
                        isp: isp,
                        user_agent: navigator.userAgent,
                        gpu: gpuInfo,
                        display: traceDisplay ? traceDisplay.textContent : null,
                        latency: tracePing ? tracePing.textContent : null
                    };
                } else {
                    // Fallback to cloudflare trace
                    const cfRes = await fetchWithTimeout('https://1.1.1.1/cdn-cgi/trace').catch(() => null);
                    if (cfRes && cfRes.ok) {
                        const text = await cfRes.text();
                        const ipMatch = text.match(/ip=([^\n]+)/);
                        const locMatch = text.match(/loc=([^\n]+)/);
                        const ip = ipMatch ? ipMatch[1] : '127.0.0.1';
                        if (traceIp) traceIp.textContent = ip;
                        if (traceCountry) traceCountry.textContent = locMatch ? `Country: ${locMatch[1]}` : 'Global';
                    }
                }
            } catch (err) {
                if (traceIp) traceIp.textContent = '127.0.0.1 [SECURE]';
            }

            traceExecuted = true;
        }

        // Rescan button
        const rescanBtn = document.getElementById('trace-rescan-btn');
        if (rescanBtn) {
            rescanBtn.addEventListener('click', () => {
                const traceIp = document.getElementById('trace-ip');
                if (traceIp) traceIp.textContent = 'Rescanning...';
                setTimeout(runClientTrace, 250);
            });
        }

        // Copy JSON Button
        const copyBtn = document.getElementById('trace-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const payload = lastTracePayload || {
                    ip: document.getElementById('trace-ip')?.textContent,
                    country: document.getElementById('trace-country')?.textContent,
                    city: document.getElementById('trace-city')?.textContent,
                    gpu: document.getElementById('trace-gpu')?.textContent
                };
                try {
                    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                    const orig = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<span>✔ COPIED!</span>';
                    setTimeout(() => { copyBtn.innerHTML = orig; }, 1600);
                } catch (e) { }
            });
        }

        // Copy IP on click
        const traceIpEl = document.getElementById('trace-ip');
        if (traceIpEl) {
            traceIpEl.addEventListener('click', async () => {
                const ip = traceIpEl.textContent;
                if (ip && !ip.includes('.')) return;
                try {
                    await navigator.clipboard.writeText(ip);
                    const orig = traceIpEl.textContent;
                    traceIpEl.textContent = '✔ Copied to clipboard!';
                    setTimeout(() => { traceIpEl.textContent = orig; }, 1200);
                } catch (e) { }
            });
        }

        // Mobile swipe right on TRACE table to return to KEV tab
        const traceTableScroll = document.getElementById('trace-table-scroll');
        if (traceTableScroll) {
            let traceTouchStartX = 0;
            let traceTouchStartY = 0;
            traceTableScroll.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    traceTouchStartX = e.touches[0].clientX;
                    traceTouchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            traceTableScroll.addEventListener('touchend', (e) => {
                if (e.changedTouches.length === 1) {
                    const dx = e.changedTouches[0].clientX - traceTouchStartX;
                    const dy = e.changedTouches[0].clientY - traceTouchStartY;
                    if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.8 && tabKev) {
                        switchTab('kev');
                    }
                }
            }, { passive: true });
        }

        // Window hooks for cockpit toggle
        window.onCockpitOpen = () => {
            if (typeof resumeKevMarquee === 'function') resumeKevMarquee();
            if (!traceExecuted && typeof runClientTrace === 'function') {
                runClientTrace();
            }
            requestAnimationFrame(() => {
                const activeTab = tabTrace && tabTrace.classList.contains('active') ? tabTrace : tabKev;
                updateChannelGlider(activeTab);
            });
        };

        window.onCockpitClose = () => {
            if (typeof pauseKevMarquee === 'function') pauseKevMarquee();
            if (pod) {
                pod.classList.remove('mobile-expanded');
            }
        };
    }

    initCyberPod();

});
