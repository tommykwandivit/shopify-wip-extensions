/**
 * Extend Shopify Checkout with a custom Post Purchase user experience.
 * This template provides two extension points:
 *
 *  1. ShouldRender - Called first, during the checkout process, when the
 *     payment page loads.
 *  2. Render - If requested by `ShouldRender`, will be rendered after checkout
 *     completes
 */
import {useEffect, useState, useRef} from 'react';
import {
  extend,
  render,
  useExtensionInput,
  BlockStack,
  Button,
  CalloutBanner,
  Spinner,
  Image,
  Layout,
  TextBlock,
  TextContainer,
  View,
  Link,
  Text,
  Heading,
} from '@shopify/post-purchase-ui-extensions-react';
// import * as CheckoutUI from '@shopify/checkout-ui-extensions-react';

// CheckoutUI.render('Checkout::Feature::Render', () => <App />);

// function App() {
//   const {extensionPoint} = CheckoutUI.useExtensionApi();

//   return (
//     <CheckoutUI.BlockStack>
//       <CheckoutUI.Button
//         onPress={() =>
//           // eslint-disable-next-line no-console
//           console.log(extensionPoint)
//         }
//       >
//         123
//       </CheckoutUI.Button>
//     </CheckoutUI.BlockStack>
//   );
// }

/**
 * Entry point for the `ShouldRender` Extension Point.
 *
 * Returns a value indicating whether or not to render a PostPurchase step, and
 * optionally allows data to be stored on the client for use in the `Render`
 * extension point.
 */
extend('Checkout::PostPurchase::ShouldRender', async ({storage}) => {
  const initialState = await getRenderData();
  const render = true;
  if (render) {
    // Saves initial state, provided to `Render` via `storage.initialData`
    await storage.update(initialState);
  }
  return {
    render,
  };
});
// Simulate results of network call, etc.
async function getRenderData() {
  return {
    render: true,
  };
}
/**
 * Entry point for the `Render` Extension Point
 *
 * Returns markup composed of remote UI components.  The Render extension can
 * optionally make use of data stored during `ShouldRender` extension point to
 * expedite time-to-first-meaningful-paint.
 */
render('Checkout::PostPurchase::Render', () => <App />);

const MAX_RETRY_COUNT = 10;

// Top-level React component
export function App() {
  const {extensionPoint, storage, done, inputData} = useExtensionInput();
  const initialState = storage.initialData;

  const timerRef = useRef(null);
  const retryCount = useRef(MAX_RETRY_COUNT);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log(inputData);
    const token = inputData.initialPurchase.referenceId;
    const shopDomain = inputData.shop.domain;

    async function getClaimToken() {
      try {
        const resp = await fetch(
          `https://dev-api.divit.dev/miles/shopify/tokens/${token}`,
          {
            method: 'GET',
            cache: 'no-cache',
            headers: {
              'x-shopify-shop-domain': shopDomain,
            },
          }
        );
        const json = await resp.json();
        console.log(json);
        if (json.data.length > 0) {
          setResult(json.data[0]);
          clearInterval(timerRef.current);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setError(e);
        clearInterval(timerRef.current);
      }
    }

    timerRef.current = setInterval(() => {
      // get token
      getClaimToken();

      // check retry next
      retryCount.current--;
      if (retryCount.current <= 0) {
        clearInterval(timerRef.current);
      }
    }, 1000);

    getClaimToken();

    return () => clearInterval(timerRef.current);
  }, []);

  function getDivitUrl() {
    if (result.claimedStatus === 'notClaim') {
      return `https://dev-consumer.divit.dev/miles/claim/${result.token}`;
    }
    return `https://dev-consumer.divit.dev/profile/miles`;
  }

  const isClaimed = result && result.claimedStatus === 'claimed';

  return (
    <BlockStack spacing="loose">
      <CalloutBanner title="">
        <Heading>You have earned divit miles.</Heading>
      </CalloutBanner>
      <Layout maxInlineSize="120">
        <Image source="https://youair.divit.dev/assets/images/payments/divit.png" />
      </Layout>
      {error && (
        <TextContainer alignment="center">
          <TextBlock size="large" appearance="warning">
            Error: {error.message}
          </TextBlock>
        </TextContainer>
      )}
      <BlockStack spacing="loose" />
      <Layout
        loading
        media={[
          {viewportSize: 'small', sizes: [1, 30, 1]},
          {viewportSize: 'medium', sizes: [300, 30, 0.5]},
          {viewportSize: 'large', sizes: [300, 30, 0.33]},
        ]}
      >
        <View>
          <Image source="https://youair.divit.dev/assets/images/email/gift1.png" />
        </View>
        <View />
        <BlockStack spacing="xloose">
          <TextContainer>
            <TextBlock size="large">You have earned</TextBlock>
          </TextContainer>
          {loading && <Spinner />}
          {!loading && !error && (
            <>
              <TextContainer>
                <TextBlock size="xlarge" emphasized>
                  {result.claimedAmount.amount / 100} divit miles
                </TextBlock>
              </TextContainer>
              <TextContainer>
                <Link to={getDivitUrl()} external={true}>
                  {!isClaimed && (
                    <Text size="large">
                      Click here to claim your divit miles
                    </Text>
                  )}
                  {isClaimed && (
                    <Text size="large">
                      Click here to view your divit miles
                    </Text>
                  )}
                </Link>
              </TextContainer>
              <Button
                submit
                onPress={() => {
                  done();
                }}
              >
                View order confirmation
              </Button>
            </>
          )}
        </BlockStack>
      </Layout>
    </BlockStack>
  );
}
