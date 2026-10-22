import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native'

import { runPhase0, type Phase0Report } from './src/spike/phase0'

type RunState = 'idle' | 'running' | 'finished'

export default function App() {
  const [state, setState] = useState<RunState>('idle')
  const [report, setReport] = useState<Phase0Report | null>(null)
  const [unexpectedError, setUnexpectedError] = useState<string | null>(null)

  const executeTest = useCallback(() => {
    setState('running')
    setReport(null)
    setUnexpectedError(null)

    setTimeout(() => {
      try {
        setReport(runPhase0())
      } catch (error) {
        setUnexpectedError(error instanceof Error ? error.message : String(error))
      } finally {
        setState('finished')
      }
    }, 50)
  }, [])

  useEffect(() => {
    const timer = setTimeout(executeTest, 500)
    return () => clearTimeout(timer)
  }, [executeTest])

  const failed = report?.ok === false || unexpectedError !== null

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>VetGestión</Text>
          <Text style={styles.subtitle}>Android · Prueba de viabilidad Fase 0</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                state === 'running'
                  ? styles.statusDotRunning
                  : failed
                    ? styles.statusDotError
                    : state === 'finished'
                      ? styles.statusDotOk
                      : styles.statusDotIdle
              ]}
            />
            <Text style={styles.statusText}>
              {state === 'running'
                ? 'Ejecutando servicios del escritorio...'
                : state === 'finished'
                  ? failed
                    ? 'La prueba encontró problemas'
                    : 'Prueba completada correctamente'
                  : 'Esperando para iniciar'}
            </Text>
          </View>

          {state === 'running' ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color="#0f766e" size="large" />
              <Text style={styles.loadingText}>
                Se están ejecutando migraciones, autenticación, inventario y ventas.
              </Text>
            </View>
          ) : null}

          {report ? (
            <>
              <View style={styles.summaryGrid}>
                <Summary value={String(report.counts?.users ?? 0)} label="Usuarios" />
                <Summary value={String(report.counts?.products ?? 0)} label="Productos" />
                <Summary value={String(report.counts?.sales ?? 0)} label="Ventas" />
                <Summary value={`${report.durationMs} ms`} label="Duración" />
              </View>

              <View style={styles.steps}>
                {report.steps.map((step) => (
                  <View key={step.name} style={styles.step}>
                    <View
                      style={[
                        styles.stepBadge,
                        step.status === 'ok' ? styles.stepBadgeOk : styles.stepBadgeError
                      ]}
                    >
                      <Text style={styles.stepBadgeText}>
                        {step.status === 'ok' ? 'OK' : 'ERROR'}
                      </Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepName}>{step.name}</Text>
                      <Text style={styles.stepDetail}>{step.detail}</Text>
                    </View>
                    <Text style={styles.stepTime}>{step.durationMs} ms</Text>
                  </View>
                ))}
              </View>

              {report.fatalError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTitle}>Error detectado</Text>
                  <Text style={styles.errorText}>{report.fatalError}</Text>
                </View>
              ) : null}

              {report.ok ? (
                <Text style={styles.note}>
                  Los datos quedaron guardados en la base SQLite local. Cerrá y abrí la
                  app, ejecutá la prueba otra vez y verificá que el usuario y las ventas
                  anteriores sigan presentes.
                </Text>
              ) : null}
            </>
          ) : null}

          {unexpectedError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>No se pudo abrir la prueba</Text>
              <Text style={styles.errorText}>{unexpectedError}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={state === 'running'}
            onPress={executeTest}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              state === 'running' && styles.buttonDisabled
            ]}
          >
            <Text style={styles.buttonText}>
              {state === 'idle' ? 'Ejecutar prueba' : 'Volver a ejecutar'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Esta pantalla es temporal. No forma parte de la interfaz final de la app.
        </Text>
      </ScrollView>
    </View>
  )
}

function Summary({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: (NativeStatusBar.currentHeight ?? 0) + 16
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32
  },
  header: {
    paddingTop: 12,
    paddingBottom: 20
  },
  brand: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  statusDotIdle: {
    backgroundColor: '#94a3b8'
  },
  statusDotRunning: {
    backgroundColor: '#f59e0b'
  },
  statusDotOk: {
    backgroundColor: '#059669'
  },
  statusDotError: {
    backgroundColor: '#dc2626'
  },
  statusText: {
    color: '#0f172a',
    flex: 1,
    fontSize: 16,
    fontWeight: '700'
  },
  loadingBlock: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 36
  },
  loadingText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18
  },
  summaryItem: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    flexBasis: '47%',
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  summaryValue: {
    color: '#0f766e',
    fontSize: 20,
    fontWeight: '800'
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },
  steps: {
    marginTop: 18
  },
  step: {
    alignItems: 'flex-start',
    borderTopColor: '#e2e8f0',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12
  },
  stepBadge: {
    borderRadius: 6,
    marginTop: 1,
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  stepBadgeOk: {
    backgroundColor: '#d1fae5'
  },
  stepBadgeError: {
    backgroundColor: '#fee2e2'
  },
  stepBadgeText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '800'
  },
  stepContent: {
    flex: 1
  },
  stepName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700'
  },
  stepDetail: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2
  },
  stepTime: {
    color: '#94a3b8',
    fontSize: 11,
    paddingTop: 3
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    marginTop: 16,
    padding: 14
  },
  errorTitle: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '800'
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4
  },
  note: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 14,
    marginTop: 20,
    paddingVertical: 14
  },
  buttonPressed: {
    backgroundColor: '#115e59'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800'
  },
  footer: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
    textAlign: 'center'
  }
})
