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
const FETCH_TIMEOUT_MS = 20000;

function isValidMitreCveId(id) {
  return /^CVE-\d{4}-\d{4,}$/i.test(id);
}

function normalizeTargetIds(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return [];
  }

  const seen = new Set();
  return rawItems.map((item, index) => {
    const rawId = typeof item === 'string' ? item : (item && item.id);
    const id = rawId ? String(rawId).trim().toUpperCase() : '';

    if (!id) {
      throw new Error(`Invalid cves-list.json item at index ${index}: missing id.`);
    }
    if (!/^CVE-\d{4}-(?:\d{4,}|[A-Z][A-Z0-9-]*)$/.test(id)) {
      throw new Error(`Invalid CVE id at index ${index}: ${id}`);
    }
    if (seen.has(id)) {
      throw new Error(`Duplicate CVE id in cves-list.json: ${id}`);
    }

    seen.add(id);
    return id;
  });
}

function addLocalRecord(localMap, record, fallbackId = '') {
  const rawId = record?.cveMetadata?.cveId || record?.id || fallbackId;
  const id = rawId ? String(rawId).trim().toUpperCase() : '';
  if (!id) {
    throw new Error('cves-local.json contains a record without an id.');
  }
  if (localMap.has(id)) {
    throw new Error(`Duplicate record in cves-local.json: ${id}`);
  }
  localMap.set(id, record);
}

async function writeJsonAtomically(filePath, jsonText) {
  const tempPath = `${filePath}.${process.pid}-${Date.now()}.tmp`;

  try {
    await fs.writeFile(tempPath, jsonText, { encoding: 'utf8', flag: 'wx' });
    const verification = JSON.parse(await fs.readFile(tempPath, 'utf8'));
    if (!Array.isArray(verification)) {
      throw new Error('Generated CVE cache is not an array.');
    }
    await fs.rename(tempPath, filePath);
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => {});
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'V1T-Security-Automation/1.0',
        'Accept': 'application/json'
      },
      cache: 'no-store',
      signal: controller.signal
    });
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status} ${res.statusText}`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms`);
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  console.log('[1/4] Reading CVE list from:', listPath);
  let listRaw;
  try {
    listRaw = await fs.readFile(listPath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read cves-list.json: ${err.message}`);
  }

  let rawItems;
  try {
    rawItems = JSON.parse(listRaw);
  } catch (err) {
    throw new Error(`Invalid cves-list.json: ${err.message}`);
  }

  const targetIds = normalizeTargetIds(rawItems);
  if (targetIds.length === 0) {
    console.log('No CVE items found in cves-list.json, exiting.');
    return;
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
      existingData.forEach(rec => addLocalRecord(localMap, rec));
    } else if (typeof existingData === 'object' && existingData !== null) {
      Object.entries(existingData).forEach(([k, v]) => {
        addLocalRecord(localMap, v, k);
      });
    } else {
      throw new Error('Root value must be an array or object.');
    }
    console.log(` -> Preserved ${localMap.size} existing records in local cache.`);
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn(' -> No prior cves-local.json found. A new cache will be created.');
    } else {
      throw new Error(`Refusing to overwrite invalid cves-local.json: ${e.message}`);
    }
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

      const fetchedId = json?.cveMetadata?.cveId
        ? String(json.cveMetadata.cveId).trim().toUpperCase()
        : '';
      if (fetchedId === id) {
        localMap.set(id, json);
        fetchedCount++;
        const title = json.containers?.cna?.title || 'Published';
        console.log(`    ✔ [200 OK] ${id}: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`);
      } else {
        throw new Error(`MITRE response id mismatch for ${id}: ${fetchedId || 'missing id'}`);
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
  await writeJsonAtomically(outPath, newStr);
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
