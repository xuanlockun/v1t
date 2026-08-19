const fs = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');

// This script is intended to be run from GitHub Actions (node >=18)
// It reads assets/data/cves-list.json and fetches each CVE from MITRE API,
// writes assets/data/cves-local.json and commits changes if any.

const repoRoot = path.join(__dirname, '..'); // assets/js -> repo root (v1t/assets)
const listPath = path.join(repoRoot, 'data', 'cves-list.json');
const outPath = path.join(repoRoot, 'data', 'cves-local.json');

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log('Reading CVE list from', listPath);
  const listRaw = await fs.readFile(listPath, 'utf8');
  const ids = JSON.parse(listRaw);
  if (!Array.isArray(ids) || ids.length === 0) {
    console.log('No CVE ids found, exiting');
    return;
  }

  const out = {};
  for (const id of ids) {
    try {
      console.log('Fetching', id);
      const url = `https://cveawg.mitre.org/api/cve/${encodeURIComponent(id)}`;
      const json = await fetchJson(url);
      out[id] = json;
      // polite delay
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.warn('Failed to fetch', id, err.message);
    }
  }

  const newStr = JSON.stringify(out, null, 2) + '\n';
  let prevStr = null;
  try {
    prevStr = await fs.readFile(outPath, 'utf8');
  } catch (e) {
    // ignore
  }

  if (prevStr === newStr) {
    console.log('No changes to cves-local.json');
    return;
  }

  console.log('Writing', outPath);
  await fs.writeFile(outPath, newStr, 'utf8');

  // Commit and push
  try {
    execSync('git config user.name "github-actions[bot]"');
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    execSync(`git add "${outPath.replace(/"/g,'\\"')}"`);
    const msg = 'Update CVE local data (automated)\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>';
    try { execSync(`git commit -m "${msg.replace(/"/g,'\\"')}"`); } catch (e) { console.log('No changes to commit or commit failed:', e.message); }
    execSync('git push origin HEAD');
    console.log('Committed and pushed updates');
  } catch (e) {
    console.error('Failed to commit/push', e);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});