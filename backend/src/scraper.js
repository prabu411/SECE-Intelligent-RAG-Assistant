const ALLOWED_ORIGIN = "https://sece.ac.in";

function isAllowedUrl(input) {
  try {
    const parsed = new URL(input);
    return parsed.protocol === "https:" && parsed.origin === ALLOWED_ORIGIN;
  } catch {
    return false;
  }
}

function htmlToText(html) {
  return String(html || "")
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
      const absolute = new URL(match[1], baseUrl);
      if (absolute.origin === ALLOWED_ORIGIN) {
        links.push(`${absolute.pathname}${absolute.search}`);
      }
    } catch {
      // Ignore malformed links.
    }
    match = pattern.exec(html);
  }

  return links;
}

async function crawlSite(startUrl, maxPages = 10, fetchImpl = fetch) {
  if (!isAllowedUrl(startUrl)) {
    return [];
  }

  const start = new URL(startUrl);
  const queue = [`${start.pathname}${start.search}`];
  const visited = new Set();
  const pages = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const currentPath = queue.shift();
    if (visited.has(currentPath)) continue;

    const currentUrl = new URL(currentPath, ALLOWED_ORIGIN).toString();
    visited.add(currentPath);

    const response = await fetchImpl(currentUrl);
    if (!response.ok) continue;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) continue;

    const html = await response.text();
    const text = htmlToText(html);
    if (text) {
      pages.push({ url: currentUrl, text });
    }

    for (const linkPath of extractLinks(html, currentUrl)) {
      if (!visited.has(linkPath)) {
        queue.push(linkPath);
      }
    }
  }

  return pages;
}

module.exports = { crawlSite, htmlToText, isAllowedUrl };
