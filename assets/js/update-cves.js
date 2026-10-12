const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');

// Script to sync CVE records from MITRE CVE API to assets/data/cves-local.json
// Can run via CLI (node update-cves.js) or in CI/CD (GitHub Actions / pre-commit).
// Reads ONLY the 'id' field from assets/data/cves-list.json (finders are strictly UI metadata).
// Preserves all existing local records intact and only fetches missing/unpopulated records.

const repoRoot = path.join(__dirname, '..'); // assets/js -> assets
const listPath = path.join(repoRoot, 'data', 'cves-list.json');
const outPath = path.join(repoRoot, 'data', 'cves-local.json');

function isValidMitreCveId(id) {
  return /^CVE-\d{4}-\d{4,}$/i.test(id);
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'V1T-Security-Automation/1.0',
      'Accept': 'application/json'
    },
    cache: 'no-store'
  });
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status} ${res.statusText}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function main() {
  console.log('[1/4] Reading CVE list from:', listPath);
  let listRaw = '[]';
  try {
    listRaw = await fs.readFile(listPath, 'utf8');
  } catch (err) {
    console.error('Failed to read cves-list.json:', err.message);
    return;
  }

  const rawItems = JSON.parse(listRaw);
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    console.log('No CVE items found in cves-list.json, exiting.');
    return;
  }

  // Extract unique CVE IDs strictly from the 'id' field
  const targetIds = [];
  for (const item of rawItems) {
    const id = typeof item === 'string' ? item.trim() : (item && item.id ? String(item.id).trim() : '');
    if (id && !targetIds.includes(id)) {
      targetIds.push(id);
    }
  }
  console.log(` -> Found ${targetIds.length} target CVE IDs in list.`);

  // [2/4] Read existing cves-local.json to preserve all existing records
  console.log('[2/4] Reading existing cache from:', outPath);
  const localMap = new Map();
  let prevStr = '';
  try {
    prevStr = await fs.readFile(outPath, 'utf8');
    const existingData = JSON.parse(prevStr);
    if (Array.isArray(existingData)) {
      existingData.forEach(rec => {
        const id = rec && rec.cveMetadata && rec.cveMetadata.cveId ? rec.cveMetadata.cveId : (rec && rec.id ? rec.id : null);
        if (id) localMap.set(id, rec);
      });
    } else if (typeof existingData === 'object' && existingData !== null) {
      Object.entries(existingData).forEach(([k, v]) => {
        localMap.set(k, v);
      });
    }
    console.log(` -> Preserved ${localMap.size} existing records in local cache.`);
  } catch (e) {
    console.log(' -> No prior cves-local.json found or invalid JSON. Starting fresh map.');
  }

  // [3/4] Check and fetch missing/unpopulated CVEs
  console.log('[3/4] Checking and syncing records with MITRE API...');
  let fetchedCount = 0;
  let cachedCount = 0;
  let skippedCount = 0;

  for (const id of targetIds) {
    const existing = localMap.get(id);
    const hasFullData = existing && existing.containers && existing.containers.cna && Object.keys(existing.containers.cna).length > 0;

    // If already populated in local cache, keep it (do not re-fetch)
    if (hasFullData) {
      cachedCount++;
      continue;
    }

    // If ID is not standard MITRE format (e.g. CVE-2026-LFI, CVE-2026-BAC)
    if (!isValidMitreCveId(id)) {
      if (!existing) {
        localMap.set(id, {
          dataType: "CVE_RECORD",
          dataVersion: "5.1",
          cveMetadata: { cveId: id, state: "CUSTOM_POC" },
          containers: {
            cna: {
              title: `${id} Research Advisory`,
              descriptions: [{ lang: "en", value: "V1T Security Research internal vulnerability record." }]
            }
          }
        });
      }
      skippedCount++;
      continue;
    }

    // Fetch from official MITRE API
    try {
      console.log(` -> Fetching details for ${id}...`);
      const url = `https://cveawg.mitre.org/api/cve/${encodeURIComponent(id)}`;
      const json = await fetchJson(url);

      if (json && json.cveMetadata) {
        localMap.set(id, json);
        fetchedCount++;
        const title = json.containers?.cna?.title || 'Published';
        console.log(`    ✔ [200 OK] ${id}: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`);
      }

      // Polite delay between requests to prevent rate limiting
      await new Promise(r => setTimeout(r, 220));
    } catch (err) {
      if (err.status === 404) {
        console.log(`    ℹ [404 Reserved/Unpublished] ${id} is not yet published on MITRE.`);
        if (!existing) {
          localMap.set(id, {
            dataType: "CVE_RECORD",
            dataVersion: "5.1",
            cveMetadata: { cveId: id, state: "RESERVED" },
            containers: {}
          });
        }
      } else {
        console.warn(`    ⚠ [Error] Failed to fetch ${id}: ${err.message}`);
      }
    }
  }

  console.log(`Summary: ${cachedCount} already cached, ${fetchedCount} newly fetched, ${skippedCount} custom/internal.`);

  // [4/4] Write output preserving Array format
  const outputArray = Array.from(localMap.values());
  const newStr = JSON.stringify(outputArray, null, 2) + '\n';

  if (prevStr === newStr) {
    console.log('No modifications needed for cves-local.json.');
    return;
  }

  console.log(`[4/4] Writing ${outputArray.length} total records to:`, outPath);
  await fs.writeFile(outPath, newStr, 'utf8');
  console.log('✔ cves-local.json updated successfully!');

  // Optional: Auto-commit if running in CI or --commit flag passed
  const shouldCommit = process.argv.includes('--commit') || process.env.GITHUB_ACTIONS === 'true';
  if (shouldCommit) {
    try {
      execSync('git config user.name "github-actions[bot]"');
      execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
      execSync(`git add "${outPath.replace(/"/g, '\\"')}"`);
      const msg = `Update CVE local data (${fetchedCount} hydrated)\n\nCo-authored-by: V1T Bot <bot@v1t.site>`;
      execSync(`git commit -m "${msg.replace(/"/g, '\\"')}"`);
      console.log('✔ Committed updates to git.');
      if (process.env.GITHUB_ACTIONS === 'true') {
        execSync('git push origin HEAD');
        console.log('✔ Pushed updates to repository.');
      }
    } catch (e) {
      console.log('Git commit notice:', e.message);
    }
  }
}

main().catch(err => {
  console.error('Fatal error in update-cves:', err);
  process.exit(1);
});