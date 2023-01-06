import { useMemo } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import * as appBrige from "../lib/app-bridge";

const defaultHeaders = {
  "Content-Type": "application/json",
};

const useShopifyFetch = () => {
  const app = useAppBridge();

  const fetcher = useMemo(() => {
    return async (uri, options) => {
      return appBrige
        .fetch(app)(uri, { headers: defaultHeaders, ...options })
        .then((response) => response?.json());
    };
  }, [app]);

  return fetcher;
};

export default useShopifyFetch;
