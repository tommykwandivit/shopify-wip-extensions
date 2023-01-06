const { Firestore } = require("@google-cloud/firestore");

const COLLECTION_PATH = "shopify-dev-session";

class SessionFirestore {
  constructor(projectId) {
    this.firestore = new Firestore({ projectId });
  }

  storeCallback = async (session) => {
    const doc = await this.firestore
      .doc(`${COLLECTION_PATH}/${session.id}`)
      .set(JSON.parse(JSON.stringify(session)));
    return !!doc;
  };

  loadCallback = async (id) => {
    const doc = await this.firestore.doc(`${COLLECTION_PATH}/${id}`).get();
    return doc.data();
  };

  deleteCallback = async (id) => {
    const doc = await this.loadCallback(id);
    if (!doc) return false;
    await this.firestore.doc(`${COLLECTION_PATH}/${id}`).delete();
    return true;
  };
}

module.exports = SessionFirestore;
