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

    function renderDetailView(container, record, cveId) {
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
                    <span class="cve-tag tag-date">📅 Published: ${datePub}</span>
                    <span class="cve-tag tag-assigner">🏢 Assigner: ${assigner}</span>
                </div>
            </div>
            <div class="cve-detail-body">
        `;

        // Description
        if (cna.descriptions && cna.descriptions[0]) {
            html += `<div class="detail-box">
                <div class="box-title">📝 Description</div>
                <div class="box-content">${cna.descriptions[0].value}</div>
            </div>`;
        }

        // Metrics & Weakness
        let metricsHtml = '';
        if (cna.metrics) {
            cna.metrics.forEach(m => {
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
                    <div class="box-title">📊 Metrics (CVSS)</div>
                    <div class="box-content">${metricsHtml}</div>
                </div>`;
            }
            if (weaknessHtml) {
                html += `<div class="detail-box flex-1">
                    <div class="box-title">🛑 Weakness (CWE)</div>
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
                <div class="box-title">🎯 Affected Products</div>
                <div class="box-content">${affectedHtml}</div>
            </div>`;
        }

        // Solution
        if (cna.solutions && cna.solutions[0]) {
            html += `<div class="detail-box">
                <div class="box-title">💡 Solution</div>
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
                <div class="box-title">🔗 References</div>
                <div class="box-content">${refHtml}</div>
            </div>`;
        }

        html += `</div>`; // end detail-body

        // Raw JSON
        const rawJson = JSON.stringify(record, null, 2);
        html += `
            <div class="cve-raw-json">
                <div class="raw-header">
                    <span>⚙️ Raw JSON Data</span>
                    <button class="copy-json-btn">📋 Copy</button>
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
                    copyBtn.textContent = '✅ Copied!';
                    setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                });
            });
        }
    }

    function makeCveCardElement(cveId, record) {
        const container = document.createElement('div');
        container.className = 'cve-card';
        container.tabIndex = 0;

        // Determine severity class based on local data if available
        let severityClass = '';
        if (record.containers && record.containers.cna && record.containers.cna.metrics) {
            for (const m of record.containers.cna.metrics) {
                const cvss = m.cvssV3_1 || m.cvssV3 || m.cvssV4_0;
                if (cvss && cvss.baseSeverity) {
                    const s = cvss.baseSeverity.toUpperCase();
                    if (s === 'CRITICAL') severityClass = 'severity-critical';
                    else if (s === 'HIGH') severityClass = 'severity-high';
                    else if (s === 'MEDIUM') severityClass = 'severity-medium';
                    else if (s === 'LOW') severityClass = 'severity-low';
                    break;
                }
            }
        }
        if (severityClass) container.classList.add(severityClass);

        const idEl = document.createElement('div');
        idEl.className = 'cve-id';
        idEl.textContent = record.cveMetadata && record.cveMetadata.cveId ? record.cveMetadata.cveId : cveId;
        container.appendChild(idEl);

        // Hover popup
        const popup = document.createElement('div');
        popup.className = 'cve-popup';
        document.body.appendChild(popup);

        async function updateAndShowPopup() {
            // Don't show popup if in split mode
            const modal = document.getElementById('cve-modal');
            if (modal && modal.classList.contains('split-mode')) return;

            try {
                const fresh = await fetchCveRecord(cveId);
                
                let baseScore = '';
                let baseSeverity = '';
                let vectorString = 'No vector string';
                let cwe = 'N/A';
                let title = fresh.containers && fresh.containers.cna && fresh.containers.cna.title ? fresh.containers.cna.title : 'No Title';
                let desc = 'No description available.';

                if (fresh.containers && fresh.containers.cna) {
                    const cna = fresh.containers.cna;
                    if (cna.metrics) {
                        for (const m of cna.metrics) {
                            const cvss = m.cvssV3_1 || m.cvssV3 || m.cvssV4_0;
                            if (cvss) {
                                baseScore = cvss.baseScore;
                                baseSeverity = cvss.baseSeverity;
                                vectorString = cvss.vectorString;
                                break;
                            }
                        }
                    }
                    if (cna.problemTypes && cna.problemTypes[0] && cna.problemTypes[0].descriptions) {
                        cwe = cna.problemTypes[0].descriptions[0].cweId || cna.problemTypes[0].descriptions[0].description;
                    }
                    if (cna.descriptions && cna.descriptions[0]) {
                        desc = cna.descriptions[0].value;
                    }
                }

                let badgesHtml = `<span class="cwe">${cwe}</span>`;
                if (baseScore !== '') {
                    badgesHtml += `<span class="severity-badge">${baseScore} | ${baseSeverity}</span>`;
                }

                popup.innerHTML = `
                    <div class="title">${title}</div>
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

                // Populate detail view
                const detailView = document.getElementById('cve-detail-view');
                if (detailView) {
                    detailView.innerHTML = '<p style="text-align:center; margin-top:50px;">Loading data...</p>';
                    const fresh = await fetchCveRecord(cveId);
                    renderDetailView(detailView, fresh, cveId);
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
