import { Page, Layout, Banner } from "@shopify/polaris";
import { ROUTES } from "../constants";

const PageNotFound = () => (
  <Page title="404 - Not Found">
    <Layout>
      <Layout.Section>
        <Banner
          title="404"
          action={{ content: "Back to Home 🏠", url: ROUTES.dashboard }}
          status="critical"
        >
          <p>Page Not Exit</p>
        </Banner>
      </Layout.Section>
    </Layout>
  </Page>
);

export default PageNotFound;
