import React, { useMemo } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  PageActions,
  Tabs,
} from "@shopify/polaris";
import { useAppBridge, TitleBar } from "@shopify/app-bridge-react";
import useSWR from "swr";
import { fetch } from "../lib/app-bridge";

const Index = () => {
  const app = useAppBridge();

  const fetcher = useMemo(() => {
    return async (uri, options) => {
      return fetch(app)(uri, options).then((response) => response?.json());
    };
  }, [app]);

  const { data } = useSWR("/themes", fetcher);

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

  return (
    <Page>
      <TitleBar />
      <Tabs tabs={tabs} selected={0}>
        <Card.Section>
          <Layout>
            <Layout.AnnotatedSection
              id="storeSetting"
              title="Store setting"
              description="Setup for divit merchant"
            >
              <Card sectioned>
                <FormLayout>
                  <TextField
                    id="storeApiKey"
                    label="Store api key"
                    helpText={
                      <span>
                        Store api key provided by Divit, it used for connect
                        divit system with Shopify store
                      </span>
                    }
                  />
                </FormLayout>
              </Card>
              <PageActions
                primaryAction={{
                  content: "Save",
                  onAction: () => {},
                }}
              />
            </Layout.AnnotatedSection>
          </Layout>
        </Card.Section>
      </Tabs>
    </Page>
  );
};

export default Index;
