import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'
import { Card, Chip, Text, useTheme } from 'react-native-paper'

type IconName = keyof typeof Ionicons.glyphMap

interface PhasePlaceholderProps {
  icon: IconName
  title: string
  description: string
  phase: string
  bullets: readonly string[]
}

export function PhasePlaceholder({
  icon,
  title,
  description,
  phase,
  bullets
}: PhasePlaceholderProps) {
  const theme = useTheme()

  return (
    <Card mode="elevated" style={styles.card}>
      <Card.Content style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: theme.colors.primaryContainer }
          ]}
        >
          <Ionicons name={icon} size={30} color={theme.colors.onPrimaryContainer} />
        </View>
        <Chip
          compact
          style={{ backgroundColor: theme.colors.secondaryContainer }}
          textStyle={{ color: theme.colors.onSecondaryContainer }}
        >
          {phase}
        </Chip>
        <View style={styles.heading}>
          <Text variant="headlineSmall" style={styles.title}>
            {title}
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
          >
            {description}
          </Text>
        </View>
        <View style={styles.bullets}>
          {bullets.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <Ionicons
                name="ellipse"
                size={7}
                color={theme.colors.primary}
                style={styles.bulletDot}
              />
              <Text variant="bodyMedium" style={styles.bulletText}>
                {bullet}
              </Text>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 4
  },
  content: {
    alignItems: 'flex-start',
    gap: 14
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 20,
    height: 64,
    justifyContent: 'center',
    width: 64
  },
  heading: {
    gap: 4
  },
  title: {
    fontWeight: '800'
  },
  description: {
    lineHeight: 21
  },
  bullets: {
    gap: 10,
    width: '100%'
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10
  },
  bulletDot: {
    marginTop: 7
  },
  bulletText: {
    flex: 1,
    lineHeight: 21
  }
})
