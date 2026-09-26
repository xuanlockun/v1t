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
    let cveGridRendered = false;

    if (showBtn && modal) {
        showBtn.addEventListener('click', async () => {
            modal.hidden = false;
            // render grid (lazy load data first time)
            if (!cveGridRendered) {
                await renderCveGrid();
                cveGridRendered = true;
            }
            const firstFocusable = modal.querySelector('.cve-close');
            if (firstFocusable) firstFocusable.focus();
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
                duckHintText.textContent = isActive ? 'COLLAPSE ✕' : 'CLICK DUCK!';
            }
            // Trigger duck hop animation
            const duckImg = duckToggle.querySelector('.stage-logo');
            if (duckImg) {
                duckImg.classList.add('duck-hop');
                setTimeout(() => duckImg.classList.remove('duck-hop'), 600);
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
            const avatar = m.avatar || `assets/images/${(m.id || m.name).toLowerCase()}.png`;

            return `
                <div class="profile-card">
                    <img src="${avatar}" alt="${m.name}" loading="lazy" onerror="this.onerror=null; this.src='assets/images/v1t.png';">
                    <h3>${m.name}</h3>
                    <h4>${role}</h4>
                    ${quoteText}
                    ${blogLink}
                </div>
            `;
        }).join('');
    }

    function renderMembersList(members) {
        const listEl = document.getElementById('members-list') || document.querySelector('.members-list') || document.querySelector('.members-cloud');
        if (!listEl || !Array.isArray(members)) return;

        const countBadge = document.getElementById('members-count-badge');
        if (countBadge) {
            countBadge.textContent = `${members.length} DUCKS`;
        }

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
                const res = await fetch('assets/data/members.json');
                if (res.ok) {
                    const list = await res.json();
                    if (Array.isArray(list)) {
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

                        // Render both sections if present on current page
                        renderTeamProfiles(list);
                        renderMembersList(list);

                        return list;
                    }
                }
            } catch (e) {
                console.warn('Failed to load members.json', e);
            }
            return [];
        })();

        return membersDataPromise;
    }

    // Load members immediately on script initialization
    loadMembersData();

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

    async function loadCveList() {
        const listUrl = 'assets/data/cves-list.json';
        try {
            const res = await fetch(listUrl);
            const rawList = await res.json();
            if (!Array.isArray(rawList)) return [];
            return rawList.map(item => {
                if (typeof item === 'string') {
                    return { id: item, finders: [] };
                }
                const id = item.id || item.cveId || item.cve || '';
                let finders = item.finders || item.finder || [];
                if (!Array.isArray(finders)) {
                    finders = finders ? [finders] : [];
                }
                return { id, finders };
            }).filter(item => Boolean(item.id));
        } catch (e) {
            console.warn('Failed to load cves-list.json', e);
            return [];
        }
    }

    // In-memory RAM store for all CVE data (single fetch, cached forever in RAM)
    const cveStore = {}; // cveId -> record object
    let cveStoreInitialized = false;
    let cveStorePromise = null;

    async function getOrInitCveStore() {
        if (cveStoreInitialized) return cveStore;
        if (cveStorePromise) return cveStorePromise;

        cveStorePromise = (async () => {
            try {
                const res = await fetch('assets/data/cves-local.json');
                if (res.ok) {
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
                                        } catch (e) {}
                                        start = -1;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to load cves-local.json', e);
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

    function renderDetailView(container, record, cveId, finders = []) {
        // Setup data
        const cna = record.containers && record.containers.cna ? record.containers.cna : {};
        const meta = record.cveMetadata || {};

        let title = cna.title || meta.cveId || cveId;
        let datePub = meta.datePublished ? new Date(meta.datePublished).toLocaleDateString() : 'N/A';
        let assigner = meta.assignerShortName || 'N/A';

        let html = `
            <div class="cve-detail-header">
                <h2>${title}</h2>
                <div class="cve-meta-tags">
                    <span class="cve-tag tag-id">${meta.cveId || cveId}</span>
                    <span class="cve-tag tag-date">Published: ${datePub}</span>
                    <span class="cve-tag tag-assigner">Assigner: ${assigner}</span>
                </div>
            </div>
            <div class="cve-detail-body">
        `;

        // Discovered By / Finders section
        const resolvedFinders = (finders || []).map(getFinderInfo).filter(Boolean);
        if (resolvedFinders.length > 0) {
            html += `
                <div class="detail-box cve-finders-box">
                    <div class="box-title"><i class="fa-solid fa-award"></i> Discovered By</div>
                    <div class="box-content">
                        <div class="finders-grid">
                            ${resolvedFinders.map(f => `
                                <div class="finder-card">
                                    <img src="${f.avatar}" class="finder-card-avatar" alt="${f.name}" onerror="this.onerror=null;this.src='assets/images/v1t.png';">
                                    <div class="finder-card-details">
                                        <div class="finder-card-name">${f.name}</div>
                                        <div class="finder-card-role">${f.role}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // Description
        if (cna.descriptions && cna.descriptions[0]) {
            html += `<div class="detail-box">
                <div class="box-title">Description</div>
                <div class="box-content">${cna.descriptions[0].value}</div>
            </div>`;
        }

        // Metrics & Weakness
        let metricsHtml = '';
        let allMetrics = [];
        if (cna.metrics) allMetrics = allMetrics.concat(cna.metrics);
        if (record.containers && record.containers.adp) {
            record.containers.adp.forEach(adp => {
                if (adp.metrics) allMetrics = allMetrics.concat(adp.metrics);
            });
        }

        if (allMetrics.length > 0) {
            allMetrics.forEach(m => {
                const cvss = m.cvssV3_1 || m.cvssV3 || m.cvssV4_0;
                if (cvss) {
                    const sevClass = (cvss.baseSeverity || 'unknown').toLowerCase();
                    metricsHtml += `<div class="metric-item">
                        <span class="metric-score badge-${sevClass}">${cvss.baseScore} ${cvss.baseSeverity}</span>
                        <span class="metric-vector">${cvss.vectorString}</span>
                    </div>`;
                }
            });
        }

        let weaknessHtml = '';
        if (cna.problemTypes && cna.problemTypes[0] && cna.problemTypes[0].descriptions) {
            const desc = cna.problemTypes[0].descriptions[0];
            weaknessHtml = `<div class="weakness-item">${desc.cweId ? `<strong class="cwe-id-badge">${desc.cweId}</strong> ` : ''}${desc.description || ''}</div>`;
        }

        if (metricsHtml || weaknessHtml) {
            html += `<div class="detail-row">`;
            if (metricsHtml) {
                html += `<div class="detail-box flex-1">
                    <div class="box-title">Metrics (CVSS)</div>
                    <div class="box-content">${metricsHtml}</div>
                </div>`;
            }
            if (weaknessHtml) {
                html += `<div class="detail-box flex-1">
                    <div class="box-title">Weakness (CWE)</div>
                    <div class="box-content">${weaknessHtml}</div>
                </div>`;
            }
            html += `</div>`;
        }

        // Affected Products
        if (cna.affected && cna.affected.length > 0) {
            let affectedHtml = `<ul class="affected-list">`;
            cna.affected.forEach(a => {
                let text = `<strong>${a.vendor || 'Unknown'}</strong> / <span>${a.product || 'Unknown'}</span>`;
                if (a.versions && a.versions.length > 0) {
                    let v = a.versions[0];
                    if (v.lessThanOrEqual) text += ` <span class="version-badge"><= ${v.lessThanOrEqual}</span>`;
                    else if (v.version && v.version !== 'unspecified') text += ` <span class="version-badge">v${v.version}</span>`;
                }
                affectedHtml += `<li>${text}</li>`;
            });
            affectedHtml += `</ul>`;
            html += `<div class="detail-box">
                <div class="box-title">Affected Products</div>
                <div class="box-content">${affectedHtml}</div>
            </div>`;
        }

        // Solution
        if (cna.solutions && cna.solutions[0]) {
            html += `<div class="detail-box">
                <div class="box-title">Solution</div>
                <div class="box-content">${cna.solutions[0].value}</div>
            </div>`;
        }

        // References
        if (cna.references && cna.references.length > 0) {
            let refHtml = `<ul class="ref-list">`;
            cna.references.forEach(r => {
                refHtml += `<li><a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.url}</a></li>`;
            });
            refHtml += `</ul>`;
            html += `<div class="detail-box">
                <div class="box-title">References</div>
                <div class="box-content">${refHtml}</div>
            </div>`;
        }

        html += `</div>`; // end detail-body

        // Raw JSON
        const rawJson = JSON.stringify(record, null, 2);
        html += `
            <div class="cve-raw-json">
                <div class="raw-header">
                    <span>Raw JSON Data</span>
                    <button class="copy-json-btn">Copy</button>
                </div>
                <pre><code id="raw-json-content">${rawJson}</code></pre>
            </div>
        `;

        container.innerHTML = html;

        // Copy button listener
        const copyBtn = container.querySelector('.copy-json-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(rawJson).then(() => {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            });
        }
    }

    function getSeverityClass(record) {
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
                    const s = cvss.baseSeverity.toUpperCase();
                    if (s === 'CRITICAL') return 'severity-critical';
                    if (s === 'HIGH') return 'severity-high';
                    if (s === 'MEDIUM') return 'severity-medium';
                    if (s === 'LOW') return 'severity-low';
                }
            }
        }
        return '';
    }

    function makeCveCardElement(cveId, record, finders = []) {
        const container = document.createElement('div');
        container.className = 'cve-card';
        container.tabIndex = 0;

        // Determine severity class based on local data if available
        const severityClass = getSeverityClass(record);
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
                img.onerror = () => { img.src = 'assets/images/v1t.png'; };
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

                let baseScore = '';
                let baseSeverity = '';
                let vectorString = 'No vector string';
                let cwe = 'N/A';
                let title = fresh.containers && fresh.containers.cna && fresh.containers.cna.title ? fresh.containers.cna.title : 'No Title';
                let desc = 'No description available.';

                if (fresh.containers && fresh.containers.cna) {
                    const cna = fresh.containers.cna;

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
                                baseScore = cvss.baseScore;
                                baseSeverity = cvss.baseSeverity;
                                vectorString = cvss.vectorString;
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
                                // Fallback: try to extract CWE-XXX from description if cweId is missing
                                const match = d.description.match(/(CWE-\d+)/i);
                                if (match) {
                                    cwe = match[1].toUpperCase();
                                    break;
                                }
                            }
                        }
                    }

                    if (cna.descriptions && cna.descriptions[0]) {
                        desc = cna.descriptions[0].value;
                    }
                }

                let badgesHtml = `<span class="cwe">${cwe}</span>`;
                if (baseScore !== '') {
                    badgesHtml += `<span class="severity-badge">${baseScore} | ${baseSeverity}</span>`;
                }

                let findersPopupHtml = '';
                if (resolvedFinders.length > 0) {
                    findersPopupHtml = `
                        <div class="cve-popup-finders">
                            <span class="finders-label"><i class="fa-solid fa-user-shield"></i> Finder:</span>
                            <div class="finders-chips">
                                ${resolvedFinders.map(f => `
                                    <span class="finder-chip" title="${f.role}">
                                        <img src="${f.avatar}" class="finder-chip-avatar" alt="${f.name}" onerror="this.onerror=null;this.src='assets/images/v1t.png';">
                                        <span class="finder-chip-name">${f.name}</span>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                popup.innerHTML = `
                    <div class="title">${title}</div>
                    ${findersPopupHtml}
                    <div class="cwe-metrics">${badgesHtml}</div>
                    <div class="desc">${desc}</div>
                    <div class="cvss">${vectorString}</div>
                `;
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
            document.querySelectorAll('.cve-card').forEach(c => c.classList.remove('active'));

            if (isActive) {
                // If it was already active, we are closing it
                if (modal) modal.classList.remove('split-mode');
            } else {
                // Otherwise, mark this one active and open split mode
                container.classList.add('active');
                if (modal) modal.classList.add('split-mode');

                const detailView = document.getElementById('cve-detail-view');
                if (detailView) {
                    const current = cveStore[cveId] || record;
                    const hasData = current && current.containers && current.containers.cna && Object.keys(current.containers.cna).length > 0;

                    if (hasData) {
                        // 1. Data exists in RAM - Instant render with 0 fetch
                        renderDetailView(detailView, current, cveId, finders);
                    } else if (isValidCveId(cveId)) {
                        // 2. Not in local data - fetch on-demand from API once and save to RAM
                        detailView.innerHTML = '<p style="text-align:center; margin-top:50px; color:#888;">Loading details from API...</p>';
                        try {
                            const apiUrl = `https://cveawg.mitre.org/api/cve/${cveId}`;
                            const r = await fetch(apiUrl, { cache: 'no-store' });
                            if (r.ok) {
                                const json = await r.json();
                                cveStore[cveId] = json;
                                renderDetailView(detailView, json, cveId, finders);
                                const sevClass = getSeverityClass(json);
                                if (sevClass) container.classList.add(sevClass);
                            } else {
                                renderDetailView(detailView, current || makePlaceholderCveRecord(cveId), cveId, finders);
                            }
                        } catch (e) {
                            renderDetailView(detailView, current || makePlaceholderCveRecord(cveId), cveId, finders);
                        }
                    } else {
                        renderDetailView(detailView, current || makePlaceholderCveRecord(cveId), cveId, finders);
                    }
                }
            }
        });

        return container;
    }

    async function renderCveGrid() {
        // Remove old popups to prevent DOM bloat and memory leaks
        document.querySelectorAll('.cve-popup').forEach(p => p.remove());

        const grid = document.getElementById('cve-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        // Fetch all files ONCE and cache in RAM
        const [listItems, store] = await Promise.all([
            loadCveList(),
            getOrInitCveStore(),
            loadMembersData()
        ]);

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

        const cardsMap = {};
        const renderedIds = new Set();

        for (const item of listItems) {
            const id = item.id;
            renderedIds.add(id);
            const record = store[id] || makePlaceholderCveRecord(id);
            store[id] = record;
            const finders = item.finders && item.finders.length > 0 ? item.finders : (findersMap[id] || []);
            const cardEl = makeCveCardElement(id, record, finders);
            cardsMap[id] = cardEl;
            grid.appendChild(cardEl);
        }

        // Append any extra CVEs present in store but not in cves-list.json
        Object.keys(store).forEach(k => {
            if (!renderedIds.has(k)) {
                renderedIds.add(k);
                const record = store[k];
                const cardEl = makeCveCardElement(k, record, findersMap[k] || []);
                cardsMap[k] = cardEl;
                grid.appendChild(cardEl);
            }
        });

        // Asynchronously try to fetch details for missing items from API (once per item)
        renderedIds.forEach(async (id) => {
            if ((!store[id] || !store[id].containers || !store[id].containers.cna || Object.keys(store[id].containers.cna).length === 0) && isValidCveId(id)) {
                try {
                    const apiUrl = `https://cveawg.mitre.org/api/cve/${id}`;
                    const r = await fetch(apiUrl, { cache: 'no-store' });
                    if (r.ok) {
                        const json = await r.json();
                        store[id] = json;
                        const card = cardsMap[id];
                        if (card) {
                            const sevClass = getSeverityClass(json);
                            if (sevClass) card.classList.add(sevClass);
                        }
                    }
                } catch (e) {
                    // ignore network/CORS error
                }
            }
        });
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

    // Expose debug helpers to window for easier console testing
    try {
        window.debugCves = {
            store: cveStore,
            getStore: getOrInitCveStore,
            renderCveGrid: async () => { await renderCveGrid(); console.log('renderCveGrid done'); }
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
