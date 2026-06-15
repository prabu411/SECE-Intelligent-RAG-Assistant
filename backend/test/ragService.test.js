const test = require("node:test");
const assert = require("node:assert/strict");
const { RagService, NOT_FOUND_MESSAGE } = require("../src/ragService");

function createFetchMock(pagesByUrl) {
  return async (url) => {
    const html = pagesByUrl[url];
    if (!html) {
      return { ok: false, headers: { get: () => "text/html" }, text: async () => "" };
    }

    return {
      ok: true,
      headers: { get: () => "text/html" },
      text: async () => html
    };
  };
}

test("returns context for hyper-specific query", async () => {
  const rag = new RagService({
    fetchImpl: createFetchMock({
      "https://sece.ac.in/projects": `
        <html>
          <body>
            <h1>Student Projects</h1>
            <p>Riya from CSE completed a final year project implementing the Gradient pattern in Android.</p>
          </body>
        </html>
      `
    })
  });

  await rag.reindexWebsite("https://sece.ac.in/projects", 1);
  const response = rag.ask("Has anyone in the college done the Gradient pattern?");

  assert.notEqual(response.answer, NOT_FOUND_MESSAGE);
  assert.match(response.answer, /gradient pattern/i);
  assert.equal(response.evidence.length, 1);
});

test("prevents hallucination when data is absent", async () => {
  const rag = new RagService({
    fetchImpl: createFetchMock({
      "https://sece.ac.in/events": `
        <html><body><p>Annual symposium took place in 2024.</p></body></html>
      `
    })
  });

  await rag.reindexWebsite("https://sece.ac.in/events", 1);
  const response = rag.ask("What is the cutoff score for admission in AI&DS?");

  assert.equal(response.answer, NOT_FOUND_MESSAGE);
  assert.equal(response.evidence.length, 0);
});
