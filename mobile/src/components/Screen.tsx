import { useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Appbar, Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { contentMaxWidth, isTabletWidth } from '../theme/layout'

interface ScreenProps {
  title: string
  subtitle?: string
  showBack?: boolean
  actions?: ReactNode
  children: ReactNode
}

export function Screen({
  title,
  subtitle,
  showBack = false,
  actions,
  children
}: ScreenProps) {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const tablet = isTabletWidth(width)

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right
        }
      ]}
    >
      <Appbar.Header
        elevated={false}
        statusBarHeight={0}
        style={[styles.appbar, { backgroundColor: theme.colors.background }]}
      >
        {showBack ? (
          <Appbar.BackAction
            onPress={() => {
              if (router.canGoBack()) {
                router.back()
              } else {
                router.replace('/')
              }
            }}
          />
        ) : null}
        <Appbar.Content title={title} titleStyle={styles.appbarTitle} />
        {actions}
      </Appbar.Header>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            maxWidth: contentMaxWidth(width),
            paddingHorizontal: tablet ? 32 : 18,
            paddingBottom: insets.bottom + 28
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {subtitle ? (
          <Text
            variant="bodyLarge"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {subtitle}
          </Text>
        ) : null}
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  appbar: {
    elevation: 0
  },
  appbarTitle: {
    fontWeight: '800'
  },
  content: {
    alignSelf: 'center',
    gap: 16,
    paddingTop: 4,
    width: '100%'
  },
  subtitle: {
    lineHeight: 22,
    marginBottom: 4
  }
})
