class InMemoryVectorStore {
  constructor() {
    this.documents = [];
  }

  clear() {
    this.documents = [];
  }

  embed(text) {
    const vector = new Array(32).fill(0);
    for (const char of text.toLowerCase()) {
      const index = char.charCodeAt(0) % vector.length;
      vector[index] += 1;
    }
    return vector;
  }

  cosineSimilarity(left, right) {
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;

    for (let i = 0; i < left.length; i += 1) {
      dot += left[i] * right[i];
      leftNorm += left[i] ** 2;
      rightNorm += right[i] ** 2;
    }

    if (!leftNorm || !rightNorm) return 0;
    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
  }

  addDocuments(chunks) {
    for (const chunk of chunks) {
      this.documents.push({
        ...chunk,
        embedding: this.embed(chunk.text)
      });
    }
  }

  search(query, topK = 3) {
    const queryEmbedding = this.embed(query);
    return this.documents
      .map((doc) => ({
        ...doc,
        score: this.cosineSimilarity(queryEmbedding, doc.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(topK, 1));
  }
}

module.exports = { InMemoryVectorStore };
