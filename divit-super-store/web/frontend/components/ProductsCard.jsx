import { useState } from "react";
import {
  Card,
  Heading,
  TextContainer,
  DisplayText,
  TextStyle,
} from "@shopify/polaris";
import { Toast } from "@shopify/app-bridge-react";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";

export function ProductsCard() {
  const emptyToastProps = { content: null };
  const [isLoading, setIsLoading] = useState(true);
  const [toastProps, setToastProps] = useState(emptyToastProps);
  const fetch = useAuthenticatedFetch();

  const {
    data,
    refetch: refetchProductCount,
    isLoading: isLoadingCount,
    isRefetching: isRefetchingCount,
  } = useAppQuery({
    url: "/api/products/count",
    reactQueryOptions: {
      onSuccess: () => {
        setIsLoading(false);
      },
    },
  });

  const {
    data: products = [],
    refetch: refetchProducts,
    isLoading: isLoadingProducts,
    isRefetching: isRefetchingProducts,
  } = useAppQuery({
    url: "/api/products",
    reactQueryOptions: {
      onSuccess: () => {
        setIsLoading(false);
      },
    },
  });

  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    refetch: refetchOrders,
  } = useAppQuery({
    url: "/api/orders",
    reactQueryOptions: {
      onSuccess: () => {
        setIsLoading(false);
      },
    },
  });

  const toastMarkup = toastProps.content && !isRefetchingCount && (
    <Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
  );

  const handlePopulate = async () => {
    setIsLoading(true);
    const response = await fetch("/api/products/create");

    if (response.ok) {
      await refetchProductCount();
      setToastProps({ content: "5 products created!" });
    } else {
      setIsLoading(false);
      setToastProps({
        content: "There was an error creating products",
        error: true,
      });
    }
  };

  const handleCreateOrder = async () => {
    setIsLoading(true);

    const response = await fetch("/api/orders/create");

    if (response.ok) {
      await refetchOrders();
      setToastProps({ content: "order created!" });
    } else {
      setIsLoading(false);
      setToastProps({
        content: "There was an error creating order",
        error: true,
      });
    }
  };

  return (
    <>
      {toastMarkup}
      <Card title="Products" sectioned>
        {products.map((product) => {
          return (
            <div key={product.id}>
              <h3>{product.title}</h3>
            </div>
          );
        })}
      </Card>
      <Card
        title="Orders"
        sectioned
        primaryFooterAction={{
          content: "Create order",
          onAction: handleCreateOrder,
          loading: isLoading,
        }}
      >
        {orders.map((order) => {
          return (
            <div key={order.id}>
              <h3>
                <a href={order.source_url}>
                  {order.order_number}: {order.total_price}
                </a>
              </h3>
            </div>
          );
        })}
      </Card>
      <Card
        title="Product Counter"
        sectioned
        primaryFooterAction={{
          content: "Populate 5 products",
          onAction: handlePopulate,
          loading: isLoading,
        }}
      >
        <TextContainer spacing="loose">
          <p>
            Sample products are created with a default title and price. You can
            remove them at any time.
          </p>
          <Heading element="h4">
            TOTAL PRODUCTS
            <DisplayText size="medium">
              <TextStyle variation="strong">
                {isLoadingCount ? "-" : data.count}
              </TextStyle>
            </DisplayText>
          </Heading>
        </TextContainer>
      </Card>
    </>
  );
}
