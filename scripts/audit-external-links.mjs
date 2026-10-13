import fs from 'node:fs/promises';

const sourceFiles = ['src/data/sources.ts', 'src/data/companies.ts'];
const urlPattern = /https:\/\/[^'"\s]+/g;

const urls = [
  ...new Set(
    (
      await Promise.all(sourceFiles.map(file => fs.readFile(file, 'utf8')))
    ).flatMap(contents => contents.match(urlPattern) ?? [])
  ),
];

async function checkUrl(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      let response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'GCC-Atlas-Link-Audit/1.0' },
      });

      if (response.status === 405) {
        response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: { 'user-agent': 'GCC-Atlas-Link-Audit/1.0' },
        });
      }

      return { url, finalUrl: response.url, status: response.status };
    } catch (error) {
      return { url, finalUrl: '', status: 'ERROR', error: error instanceof Error ? error.message : String(error) };
    } finally {
      clearTimeout(timeout);
    }
}

// A small worker pool avoids triggering rate limits on the sites we audit.
const results = [];
const pendingUrls = [...urls];
const workers = Array.from({ length: Math.min(6, pendingUrls.length) }, async () => {
  while (pendingUrls.length > 0) {
    const url = pendingUrls.shift();
    if (url) results.push(await checkUrl(url));
  }
});
await Promise.all(workers);

for (const result of results.sort((a, b) => String(a.status).localeCompare(String(b.status)))) {
  const outcome = result.status === 404 || result.status === 410
    ? 'BROKEN'
    : typeof result.status === 'number' && result.status < 400
      ? 'OK'
      : 'REVIEW';
  console.log(`${outcome}\t${result.status}\t${result.finalUrl || result.error}\t${result.url}`);
}

if (results.some(result => result.status === 404 || result.status === 410)) {
  process.exitCode = 1;
}
