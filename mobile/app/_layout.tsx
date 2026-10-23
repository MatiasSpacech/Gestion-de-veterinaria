import '../src/polyfills'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { LockScreen } from '../src/components/LockScreen'
import { configureNotifications } from '../src/data/notifications'
import { SessionProvider, useSession } from '../src/data/session-provider'
import { theme } from '../src/theme'

function AppShell() {
  const { locked } = useSession()

  useEffect(() => {
    void configureNotifications()
  }, [])

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background }
        }}
      />
      {locked ? <LockScreen /> : null}
    </View>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <SessionProvider>
          <AppShell />
        </SessionProvider>
      </PaperProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
})
