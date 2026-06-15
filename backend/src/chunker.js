function semanticChunk(text, metadata = {}, chunkSize = 800) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const parts = normalized
    .split(/(?<=[.?!])\s+|\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  let buffer = "";

  for (const part of parts) {
    const next = buffer ? `${buffer} ${part}` : part;
    if (next.length <= chunkSize) {
      buffer = next;
      continue;
    }

    if (buffer) {
      chunks.push({ text: buffer, metadata });
    }
    buffer = part;
  }

  if (buffer) {
    chunks.push({ text: buffer, metadata });
  }

  return chunks;
}

module.exports = { semanticChunk };
