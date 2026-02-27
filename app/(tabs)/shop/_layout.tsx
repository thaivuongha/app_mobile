import { Stack } from 'expo-router';

export default function ShopLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="addresses" />
    </Stack>
  );
}
