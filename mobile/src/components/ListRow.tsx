import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'

import { TOUCH_TARGET } from '../theme/tokens'

type IconName = keyof typeof Ionicons.glyphMap

interface ListRowProps {
  icon: IconName
  title: string
  description?: string
  onPress?: () => void
  disabled?: boolean
  showChevron?: boolean
}

export function ListRow({
  icon,
  title,
  description,
  onPress,
  disabled = false,
  showChevron = true
}: ListRowProps) {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled ? { backgroundColor: theme.colors.surfaceVariant } : null,
        disabled ? styles.rowDisabled : null
      ]}
    >
      <View
        style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]}
      >
        <Ionicons name={icon} size={22} color={theme.colors.onPrimaryContainer} />
      </View>
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.title}>
          {title}
        </Text>
        {description ? (
          <Text
            variant="bodySmall"
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {showChevron ? (
        <Ionicons
          name="chevron-forward"
          size={22}
          color={theme.colors.onSurfaceVariant}
        />
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 14,
    minHeight: TOUCH_TARGET + 16,
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  rowDisabled: {
    opacity: 0.55
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  content: {
    flex: 1,
    gap: 2
  },
  title: {
    fontWeight: '600'
  },
  description: {
    lineHeight: 18
  }
})
