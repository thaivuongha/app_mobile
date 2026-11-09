import { Redirect } from 'expo-router';

/** Danh sách đơn nằm trong stack Shop để nút back quay đúng màn trước. */
export default function OrdersIndexRedirect() {
  return <Redirect href="/(tabs)/shop/orders" />;
}
