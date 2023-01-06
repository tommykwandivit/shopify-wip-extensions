const { Firestore } = require("@google-cloud/firestore");

const COLLECTION_PATH = "shopify-dev-shop";

class AppFirestore {
  constructor(projectId) {
    this.firestore = new Firestore({ projectId });
  }

  installApp = async ({ shop, accessToken, scope }) => {
    const doc = await this.firestore
      .doc(`${COLLECTION_PATH}/${shop}`)
      .set({ shop, accessToken, scope });
    return !!doc;
  };

  loadShop = async (shop) => {
    const doc = await this.firestore.doc(`${COLLECTION_PATH}/${shop}`).get();
    return doc.data();
  };

  hasShop = async (shop) => {
    return !!(await this.loadShop(shop));
  };

  loginMerchant = async ({ shop, client_id, client_secret, merchantId }) => {
    const doc = await this.firestore
      .doc(`${COLLECTION_PATH}/${shop}`)
      .update({ client_id, client_secret, merchantId });
    return !!doc;
  };

  uninstallApp = async (shop) => {
    const doc = await this.firestore
      .doc(`${COLLECTION_PATH}/${shop}`)
      .update({ active: false });
    return !!doc;
  };
}

module.exports = AppFirestore;
