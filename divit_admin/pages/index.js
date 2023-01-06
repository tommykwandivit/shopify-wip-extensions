import { useEffect } from "react";
import { useRouter } from "next/router";
import { ROUTES } from "../constants";
import useShopifyFetch from "./useShopifyFetch";

const Index = () => {
  const router = useRouter();
  const fetch = useShopifyFetch();

  useEffect(() => {
    async function checkShop() {
      const { success } = await fetch("/api/shop");
      if (success) {
        router.replace(ROUTES.dashboard);
      } else {
        router.replace(ROUTES.login);
      }
    }

    checkShop();
  }, []);

  return null;
};

export default Index;
