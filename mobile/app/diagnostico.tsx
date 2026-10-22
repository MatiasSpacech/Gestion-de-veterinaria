import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  ActivityIndicator,
  Card,
  Chip,
  Text,
  useTheme
} from 'react-native-paper'

import { AppButton } from '../src/components/AppButton'
import { MetricCard } from '../src/components/MetricCard'
import { Screen } from '../src/components/Screen'
import { runPhase0, type Phase0Report } from '../src/spike/phase0'

type RunState = 'idle' | 'running' | 'finished'

export default function DiagnosticScreen() {
  const [state, setState] = useState<RunState>('idle')
  const [report, setReport] = useState<Phase0Report | null>(null)
  const [unexpectedError, setUnexpectedError] = useState<string | null>(null)
  const theme = useTheme()

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
    const timer = setTimeout(executeTest, 300)
    return () => clearTimeout(timer)
  }, [executeTest])

  const failed = report?.ok === false || unexpectedError !== null

  return (
    <Screen
      showBack
      title="Diagnóstico"
      subtitle="Verificación de la Fase 0 con los servicios reales del escritorio."
    >
      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                state === 'running'
                  ? '#f59e0b'
                  : failed
                    ? theme.colors.error
                    : state === 'finished'
                      ? theme.colors.primary
                      : theme.colors.outline
            }
          ]}
        />
        <Text variant="bodyMedium" style={styles.statusText}>
          {state === 'running'
            ? 'Ejecutando servicios del escritorio...'
            : state === 'finished'
              ? failed
                ? 'La prueba encontró problemas'
                : 'Prueba completada correctamente'
              : 'Esperando para iniciar'}
        </Text>
        {state === 'running' ? <ActivityIndicator size="small" /> : null}
      </View>

      {report ? (
        <>
          <View style={styles.grid}>
            <MetricCard
              icon="people-outline"
              label="Usuarios"
              value={String(report.counts?.users ?? 0)}
            />
            <MetricCard
              icon="cube-outline"
              label="Productos"
              value={String(report.counts?.products ?? 0)}
            />
            <MetricCard
              icon="receipt-outline"
              label="Ventas"
              value={String(report.counts?.sales ?? 0)}
            />
            <MetricCard
              icon="timer-outline"
              label="Duración"
              value={`${report.durationMs} ms`}
            />
          </View>

          <Card mode="elevated">
            <Card.Content style={styles.steps}>
              {report.steps.map((step) => (
                <View key={step.name} style={styles.step}>
                  <Chip
                    compact
                    style={{
                      backgroundColor:
                        step.status === 'ok'
                          ? theme.colors.primaryContainer
                          : theme.colors.errorContainer
                    }}
                    textStyle={{
                      color:
                        step.status === 'ok'
                          ? theme.colors.onPrimaryContainer
                          : theme.colors.onErrorContainer
                    }}
                  >
                    {step.status === 'ok' ? 'OK' : 'ERROR'}
                  </Chip>
                  <View style={styles.stepContent}>
                    <Text variant="titleSmall" style={styles.stepName}>
                      {step.name}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.stepDetail,
                        { color: theme.colors.onSurfaceVariant }
                      ]}
                    >
                      {step.detail}
                    </Text>
                  </View>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {step.durationMs} ms
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>

          {report.fatalError ? (
            <Card
              mode="contained"
              style={{ backgroundColor: theme.colors.errorContainer }}
            >
              <Card.Content style={styles.errorContent}>
                <Text
                  variant="titleSmall"
                  style={{ color: theme.colors.onErrorContainer }}
                >
                  Error detectado
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onErrorContainer }}
                >
                  {report.fatalError}
                </Text>
              </Card.Content>
            </Card>
          ) : null}

          {report.ok ? (
            <Text
              variant="bodySmall"
              style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
            >
              Los datos quedaron guardados en la base SQLite local. Cerrá y abrí la
              app, ejecutá la prueba otra vez y verificá que el usuario y las ventas
              anteriores sigan presentes.
            </Text>
          ) : null}
        </>
      ) : null}

      {unexpectedError ? (
        <Card
          mode="contained"
          style={{ backgroundColor: theme.colors.errorContainer }}
        >
          <Card.Content style={styles.errorContent}>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onErrorContainer }}
            >
              No se pudo abrir la prueba
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onErrorContainer }}
            >
              {unexpectedError}
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      <AppButton
        mode="contained"
        icon="play"
        loading={state === 'running'}
        disabled={state === 'running'}
        onPress={executeTest}
      >
        {state === 'idle' ? 'Ejecutar prueba' : 'Volver a ejecutar'}
      </AppButton>

      <Text
        variant="bodySmall"
        style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
      >
        Esta pantalla es temporal y no forma parte de la interfaz final. La prueba
        reutiliza migraciones, seed y servicios del escritorio.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10
  },
  statusText: {
    flex: 1
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  steps: {
    gap: 16
  },
  step: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10
  },
  stepContent: {
    flex: 1,
    gap: 2
  },
  stepName: {
    fontWeight: '700'
  },
  stepDetail: {
    lineHeight: 18
  },
  errorContent: {
    gap: 4
  },
  note: {
    lineHeight: 18
  }
})
