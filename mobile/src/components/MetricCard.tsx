import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Card, Text, useTheme } from 'react-native-paper'

type IconName = keyof typeof Ionicons.glyphMap

interface MetricCardProps {
  icon: IconName
  label: string
  value: string
  hint?: string
  style?: StyleProp<ViewStyle>
}

export function MetricCard({ icon, label, value, hint, style }: MetricCardProps) {
  const theme = useTheme()

  return (
    <Card mode="elevated" style={[styles.card, style]}>
      <Card.Content style={styles.content}>
        <View
          style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}
        >
          <Ionicons name={icon} size={22} color={theme.colors.onPrimaryContainer} />
        </View>
        <Text variant="headlineSmall" style={styles.value}>
          {value}
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
        >
          {label}
        </Text>
        {hint ? (
          <Text
            variant="bodySmall"
            style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
          >
            {hint}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    minWidth: 140
  },
  content: {
    gap: 6
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    marginBottom: 4,
    width: 40
  },
  value: {
    fontWeight: '800'
  },
  label: {
    lineHeight: 20
  },
  hint: {
    lineHeight: 18
  }
})
