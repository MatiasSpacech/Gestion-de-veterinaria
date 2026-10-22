import { Ionicons } from '@expo/vector-icons'
import { Redirect, Tabs } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'

import { useSession } from '../../src/data/session-provider'
import { useResponsiveLayout } from '../../src/theme/use-layout'

export default function TabsLayout() {
  const { user, ready, needsSetup } = useSession()
  const theme = useTheme()
  const { isTablet } = useResponsiveLayout()

  if (!ready) {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Abriendo la base local...
        </Text>
      </View>
    )
  }

  if (needsSetup) {
    return <Redirect href="/setup" />
  }

  if (!user) {
    return <Redirect href="/login" />
  }

  const iconColor = (focused: boolean): string =>
    focused ? theme.colors.primary : theme.colors.onSurfaceVariant

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarPosition: isTablet ? 'left' : 'bottom',
        tabBarVariant: isTablet ? 'material' : 'uikit',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={iconColor(focused)}
            />
          )
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="calendar-outline"
              size={size}
              color={iconColor(focused)}
            />
          )
        }}
      />
      <Tabs.Screen
        name="vender"
        options={{
          title: 'Vender',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="cart-outline"
              size={size}
              color={iconColor(focused)}
            />
          )
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="people-outline"
              size={size}
              color={iconColor(focused)}
            />
          )
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: 'Más',
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="menu-outline"
              size={size}
              color={iconColor(focused)}
            />
          )
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center'
  }
})
