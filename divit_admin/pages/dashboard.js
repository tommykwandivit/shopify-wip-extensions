import React, { useState, useEffect } from "react";
import { Page, Layout, Card, Tabs, DataTable, Spinner } from "@shopify/polaris";
import useShopifyFetch from "./useShopifyFetch";

const Dashboard = () => {
  const fetch = useShopifyFetch();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  useEffect(() => {
    const getTokens = async () => {
      setLoading(true);
      const { data } = await fetch("/api/tokens", { method: "GET" });
      setData(data.data);
      setLoading(false);
    };

    getTokens();
  }, []);

  const tabs = [
    {
      id: "dashboard",
      content: "Dashboard",
      accessibilityLabel: "dashboard",
      panelID: "dashboard",
    },
    {
      id: "setting",
      content: "Setting",
      accessibilityLabel: "setting",
      panelID: "setting",
    },
  ];

  const rows = data.map((d) => [d.token, d.claimedAmount.amount / 100]);

  return (
    <Page
      title="Dashboard"
      secondaryActions={[
        {
          content: "Go partner portal",
          onAction: () =>
            window.open("https://dev-partners.divit.dev/", "_blank"),
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            {loading && <Spinner />}
            <DataTable
              columnContentTypes={["text", ""]}
              headings={["token", "amount"]}
              rows={rows}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default Dashboard;
