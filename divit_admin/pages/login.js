import React, { useState } from "react";
import { useRouter } from "next/router";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  PageActions,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import useShopifyFetch from "./useShopifyFetch";

const Login = () => {
  const fetch = useShopifyFetch();

  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("api@youair.com");
  const [password, setPassword] = useState("Wk#MeMB7C31a");

  const handleLogin = async () => {
    setLoading(true);
    const data = {
      client_id: username,
      client_secret: password,
    };
    try {
      const { success } = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (success) {
        router.replace("/dashboard");
      }
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <Page narrowWidth>
      <TitleBar />
      <Card title="Login divit" sectioned>
        <FormLayout>
          <TextField
            id="username"
            label="Username"
            value={username}
            onChange={(v) => setUsername(v)}
          />
          <TextField
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={(v) => setPassword(v)}
          />
        </FormLayout>
      </Card>
      <PageActions
        primaryAction={{
          content: "login",
          loading: loading,
          onAction: () => {
            handleLogin();
          },
        }}
      />
    </Page>
  );
};

export default Login;
