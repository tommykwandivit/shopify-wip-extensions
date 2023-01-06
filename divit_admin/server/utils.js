import jwt from "jsonwebtoken";
import crypto from "crypto";

export const verifyWebhook = (rawBody, hmacHeader, shopifyApiSecret) => {
  const hmac = crypto
    .createHmac("sha256", shopifyApiSecret)
    .update(rawBody)
    .digest("base64");
  const digest = Buffer.from(hmac, "utf-8");
  return crypto.timingSafeEqual(digest, hmacHeader);
};

export const verifyPostPurchaseToken = (
  token,
  referenceId,
  shopifyApiSecret
) => {
  const decodedToken = jwt.verify(token, shopifyApiSecret);
  const decodedReferenceId =
    decodedToken.input_data.initialPurchase.referenceId;
  return decodedReferenceId === referenceId;
};

// add webhook when server is restarted
export const addWebhook = (shopify, options) => {
  const found = shopify.Webhooks.Registry.webhookRegistry.find(
    (webhook) => webhook.topic === options.topic
  );
  if (found) return;
  shopify.Webhooks.Registry.webhookRegistry.push(options);
};
