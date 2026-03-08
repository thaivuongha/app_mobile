import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '@/src/stores/cartStore';
import { Colors } from '@/constants/Colors';

// ─── Cart badge ───────────────────────────────────────────────────────────────

function BadgeDot({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : String(count)}</Text>
    </View>
  );
}

// ─── Tab icon wrapper (pill khi active) ───────────────────────────────────────

function TabIcon({
  name,
  activeName,
  focused,
  color,
  cartCount,
}: {
  name: keyof typeof Ionicons.glyphMap;
  activeName: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  cartCount?: number;
}) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Ionicons
        name={focused ? activeName : name}
        size={22}
        color={focused ? '#fff' : Colors.textMuted}
      />
      {cartCount != null && <BadgeDot count={cartCount} />}
    </View>
  );
}

export default function TabLayout() {
  const cartCount = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0),
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Thiết bị',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="cube-outline"
              activeName="cube"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="storefront-outline"
              activeName="storefront"
              focused={focused}
              color={color}
              cartCount={cartCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Doanh thu',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="bar-chart-outline"
              activeName="bar-chart"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="person-outline"
              activeName="person"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      {/* Hidden routes — navigable nhưng không hiện tab bar */}
      <Tabs.Screen name="devices" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.card,
    borderTopWidth: 0,
    height: 68,
    paddingBottom: 8,
    paddingTop: 6,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 24,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Icon pill
  tabIcon: {
    width: 48,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // Cart badge
  badge: {
    position: 'absolute',
    right: -2,
    top: -3,
    backgroundColor: Colors.orange,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.card,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
