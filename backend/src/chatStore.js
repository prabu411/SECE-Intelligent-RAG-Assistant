class InMemoryChatStore {
  constructor() {
    this.messages = [];
  }

  async add(entry) {
    this.messages.push({ ...entry, createdAt: new Date().toISOString() });
  }

  async list(limit = 25) {
    return this.messages.slice(-limit).reverse();
  }
}

class MongoChatStore {
  constructor(db, collectionName = "chat_history") {
    this.collection = db.collection(collectionName);
  }

  async add(entry) {
    await this.collection.insertOne({ ...entry, createdAt: new Date() });
  }

  async list(limit = 25) {
    return this.collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  }
}

module.exports = { InMemoryChatStore, MongoChatStore };
