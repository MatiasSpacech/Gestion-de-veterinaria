import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Button, Text, useTheme } from 'react-native-paper'

export default function NotFoundScreen() {
  const router = useRouter()
  const theme = useTheme()

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Pantalla no encontrada
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.text, { color: theme.colors.onSurfaceVariant }]}
      >
        La ruta que buscás no existe en esta versión de la app.
      </Text>
      <Button mode="contained" icon="home" onPress={() => router.replace('/')}>
        Volver al inicio
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 24
  },
  title: {
    fontWeight: '800',
    textAlign: 'center'
  },
  text: {
    textAlign: 'center'
  }
})
