import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'

type IconName = keyof typeof Ionicons.glyphMap

interface EmptyStateProps {
  icon: IconName
  title: string
  description?: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  const theme = useTheme()

  return (
    <View style={styles.container}>
      <View
        style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceVariant }]}
      >
        <Ionicons name={icon} size={28} color={theme.colors.onSurfaceVariant} />
      </View>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {description}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 32
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  title: {
    fontWeight: '700',
    textAlign: 'center'
  },
  description: {
    lineHeight: 20,
    textAlign: 'center'
  }
})
