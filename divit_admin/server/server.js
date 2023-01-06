import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import Shopify, { ApiVersion } from "@shopify/shopify-api";
import Koa from "koa";
import cors from "@koa/cors";
import next from "next";
import Router from "koa-router";
import koaBody from "koa-bodyparser";
import { addWebhook, verifyPostPurchaseToken } from "./utils";
import FormData from "form-data";
import SessionFirestore from "./sessionfirestore";
import AppFirestore from "./AppFirestore";

dotenv.config();
const port = 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev,
});
const handle = app.getRequestHandler();

const appFirestore = new AppFirestore("divit-dev-1");
const sessionFirestore = new SessionFirestore("divit-dev-1");

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES.split(","),
  HOST_NAME: process.env.HOST.replace(/https:\/\//, ""),
  API_VERSION: ApiVersion.October20,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.CustomSessionStorage(
    sessionFirestore.storeCallback,
    sessionFirestore.loadCallback,
    sessionFirestore.deleteCallback
  ),
});

app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  server.keys = [Shopify.Context.API_SECRET_KEY];

  const webhookAppUninstallHandler = async (topic, shop, body) => {
    await appFirestore.uninstallApp(shop);
  };

  // register webhooks when restart server
  addWebhook(Shopify, {
    path: "/webhooks",
    topic: "APP_UNINSTALLED",
    webhookHandler: webhookAppUninstallHandler,
  });

  server.use(
    createShopifyAuth({
      accessMode: "online",
      prefix: "/online",
      async afterAuth(ctx) {
        // Online access mode access token and shop available in ctx.state.shopify
        const { shop } = ctx.state.shopify;

        // Redirect to app with shop parameter upon auth
        ctx.redirect(
          `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`
        );
      },
    })
  );

  server.use(
    createShopifyAuth({
      accessMode: "offline",
      prefix: "/offline",
      async afterAuth(ctx) {
        // Access token and shop available in ctx.state.shopify
        const { shop, accessToken, scope } = ctx.state.shopify;
        const host = ctx.query.host;

        await appFirestore.installApp({
          shop,
          accessToken,
          scope,
        });

        const response = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "/webhooks",
          topic: "APP_UNINSTALLED",
          webhookHandler: webhookAppUninstallHandler,
        });

        if (!response.success) {
          console.log(
            `Failed to register APP_UNINSTALLED webhook: ${response.result}`
          );
        }

        const bresponse = await Shopify.Webhooks.Registry.register({
          shop,
          accessToken,
          path: "/webhooks",
          topic: "CHECKOUTS_CREATE",
          webhookHandler: async (topic, shop, body) =>
            console.log(topic, shop, body),
        });

        if (!bresponse.success) {
          console.log(
            `Failed to register CHECKOUTS_CREATE webhook: ${bresponse.result}`
          );
        }

        // Redirect to app with shop parameter upon auth
        ctx.redirect(`/online/auth?shop=${shop}&host=${host}`);
      },
    })
  );

  const handleRequest = async (ctx) => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  };

  router.all(
    "(/api/post-purchase/.*)",
    cors({
      origin: "https://shopify-argo-internal.com",
      allowMethods: ["POST"],
    })
  );

  const verifyIfActiveShopifyShop = async (ctx, next) => {
    const { shop } = ctx.query;

    // This shop hasn't been seen yet, go through OAuth to create a session
    const hasShop = await appFirestore.hasShop(shop);
    if (!hasShop) {
      ctx.redirect(`/offline/auth?shop=${shop}`);
      return;
    }

    return next();
  };

  const verifyPostPurchaseTokenMiddleware = (ctx, next) => {
    const { token, reference_id: referenceId } = ctx.request.body;
    if (
      verifyPostPurchaseToken(
        token,
        referenceId,
        process.env.SHOPIFY_API_SECRET
      )
    ) {
      return next();
    }
    ctx.res.statusCode = 401;
  };

  router.post("/webhooks", async (ctx) => {
    try {
      await Shopify.Webhooks.Registry.process(ctx.req, ctx.res);
      console.log(`Webhook processed, returned status code 200`);
    } catch (error) {
      console.log(`Failed to process webhook: ${error}`);
    }
  });

  router.post(
    "/graphql",
    verifyRequest({ returnHeader: true, authRoute: "/online/auth" }),
    async (ctx, next) => {
      await Shopify.Utils.graphqlProxy(ctx.req, ctx.res);
    }
  );

  router.post(
    "/api/post-purchase/token",
    koaBody(),
    verifyPostPurchaseTokenMiddleware,
    async (ctx) => {
      // TODO: get tokens from divit
      ctx.body = { success: "ok" };
      ctx.res.statusCode = 200;
    }
  );

  router.get(
    "/themes",
    verifyRequest({ authRoute: "/online/auth" }),
    async (ctx) => {
      const session = await Shopify.Utils.loadCurrentSession(ctx.req, ctx.res);
      console.log(session);
      const clients = {
        rest: new Shopify.Clients.Rest(session.shop, session.accessToken),
      };
      // Use `client.get` to request list of themes on store
      const {
        body: { themes },
      } = await clients.rest.get({ path: "themes" });

      // Find the published theme
      const publishedTheme = themes.find((theme) => theme.role === "main");
      ctx.body = { theme: publishedTheme };
      ctx.res.statusCode = 200;
    }
  );

  const login = async (data) => {
    const form = new FormData();
    Object.keys(data).forEach((key) => form.append(key, data[key]));
    const resp = await fetch("https://dev-api.divit.dev/login", {
      method: "POST",
      body: form,
    });
    return resp.json();
  };

  const getTokens = async ({ token, merchantId }) => {
    const resp = await fetch(
      `https://dev-api.divit.dev/miles/merchants/${merchantId}/issue/result`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      }
    );
    return resp.json();
  };

  router.get(
    "/api/shop",
    verifyRequest({ authRoute: "/online/auth" }),
    async (ctx) => {
      const { shop } = await Shopify.Utils.loadCurrentSession(ctx.req, ctx.res);
      try {
        const { client_id } = await appFirestore.loadShop(shop);
        if (client_id) {
          ctx.body = { success: "ok" };
        } else {
          ctx.body = { success: "" };
        }
        ctx.res.statusCode = 200;
      } catch (err) {
        ctx.res.statusCode = 400;
      }
    }
  );

  router.post(
    "/api/login",
    koaBody(),
    verifyRequest({ authRoute: "/online/auth" }),
    async (ctx) => {
      const { shop } = await Shopify.Utils.loadCurrentSession(ctx.req, ctx.res);
      const { client_id, client_secret } = ctx.request.body;
      const data = { client_id, client_secret };
      try {
        const loginData = await login(data);
        await appFirestore.loginMerchant({
          shop,
          client_id,
          client_secret,
          merchantId: "6d2d7837-c722-410a-8981-d6b5ca7a86ce",
        });
        ctx.body = { success: "ok", data: loginData };
        ctx.res.statusCode = 200;
      } catch (err) {
        ctx.res.statusCode = 400;
      }
    }
  );

  router.get(
    "/api/tokens",
    verifyRequest({ authRoute: "/online/auth" }),
    async (ctx) => {
      const { shop } = await Shopify.Utils.loadCurrentSession(ctx.req, ctx.res);
      const {
        client_id,
        client_secret,
        merchantId,
      } = await appFirestore.loadShop(shop);
      try {
        const loginData = await login({ client_id, client_secret });
        const { token } = loginData;
        const tokens = await getTokens({ token, merchantId });
        ctx.body = { success: "ok", data: tokens };
        ctx.res.statusCode = 200;
      } catch (err) {
        ctx.res.statusCode = 400;
      }
    }
  );

  router.get("(/_next/static/.*)", handleRequest); // Static content is clear
  router.get("/_next/webpack-hmr", handleRequest); // Webpack content is clear
  router.get("(.*)", verifyIfActiveShopifyShop, handleRequest);

  server.use(router.allowedMethods());
  server.use(router.routes());
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
