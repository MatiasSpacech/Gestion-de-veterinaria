import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Card, Text, useTheme } from 'react-native-paper'

interface SectionCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  const theme = useTheme()

  return (
    <Card mode="elevated">
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={styles.title}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {action}
        </View>
        {children}
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 12
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  headerText: {
    flex: 1,
    gap: 2
  },
  title: {
    fontWeight: '700'
  }
})
