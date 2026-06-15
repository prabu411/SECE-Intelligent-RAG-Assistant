function htmlToText(html) {
  const removedScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  return removedScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinks(html, baseUrl) {
  const links = [];
  const pattern = /href=["']([^"'#]+)["']/gi;
  let match = pattern.exec(html);

  while (match) {
    try {
      const absolute = new URL(match[1], baseUrl).toString();
      links.push(absolute);
    } catch {
      // Ignore malformed links.
    }
    match = pattern.exec(html);
  }

  return links;
}

async function crawlSite(startUrl, maxPages = 10, fetchImpl = fetch) {
  const start = new URL(startUrl);
  const queue = [start.toString()];
  const visited = new Set();
  const pages = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const response = await fetchImpl(current);
    if (!response.ok) continue;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) continue;

    const html = await response.text();
    const text = htmlToText(html);
    if (text) {
      pages.push({ url: current, text });
    }

    for (const link of extractLinks(html, current)) {
      const parsed = new URL(link);
      if (parsed.hostname === start.hostname && !visited.has(parsed.toString())) {
        queue.push(parsed.toString());
      }
    }
  }

  return pages;
}

module.exports = { crawlSite, htmlToText };
