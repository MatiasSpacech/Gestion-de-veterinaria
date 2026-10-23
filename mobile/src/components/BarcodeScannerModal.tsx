import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import { useEffect, useRef } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { TOUCH_TARGET } from '../theme/tokens'

interface BarcodeScannerModalProps {
  visible: boolean
  onClose: () => void
  onScanned: (code: string) => void
}

const BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code39',
  'code93',
  'code128',
  'itf14',
  'codabar',
  'qr',
  'datamatrix',
  'pdf417'
] as const

export function BarcodeScannerModal({
  visible,
  onClose,
  onScanned
}: BarcodeScannerModalProps) {
  const insets = useSafeAreaInsets()
  const [permission, requestPermission] = useCameraPermissions()
  const scannedRef = useRef(false)
  const requestedRef = useRef(false)

  useEffect(() => {
    if (!visible) {
      scannedRef.current = false
      requestedRef.current = false
      return
    }

    if (permission && !permission.granted && !requestedRef.current) {
      requestedRef.current = true
      void requestPermission()
    }
  }, [permission, requestPermission, visible])

  const handleScan = (result: BarcodeScanningResult) => {
    if (scannedRef.current) {
      return
    }

    scannedRef.current = true
    onScanned(result.data)
    onClose()
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      visible={visible}
    >
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            facing="back"
            onBarcodeScanned={handleScan}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={styles.permissionBox}>
            {permission === null ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={48} color="#ffffff" />
                <Text variant="titleMedium" style={styles.permissionTitle}>
                  Permiso de cámara
                </Text>
                <Text variant="bodyMedium" style={styles.permissionText}>
                  Necesitamos la cámara para leer el código de barras del
                  producto.
                </Text>
                <Pressable
                  onPress={() => {
                    requestedRef.current = true
                    void requestPermission()
                  }}
                  style={styles.permissionButton}
                >
                  <Text variant="labelLarge" style={styles.permissionButtonText}>
                    Habilitar cámara
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable
            accessibilityLabel="Cerrar escáner"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </Pressable>
          <Text variant="titleMedium" style={styles.topTitle}>
            Escanear código
          </Text>
          <View style={styles.closeButton} />
        </View>

        {permission?.granted ? (
          <>
            <View pointerEvents="none" style={styles.frame} />
            <View style={[styles.hint, { paddingBottom: insets.bottom + 24 }]}>
              <Text variant="bodyMedium" style={styles.hintText}>
                Apuntá al código de barras del producto
              </Text>
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    flex: 1
  },
  permissionBox: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 32
  },
  permissionTitle: {
    color: '#ffffff',
    fontWeight: '700'
  },
  permissionText: {
    color: '#d7e4dc',
    textAlign: 'center'
  },
  permissionButton: {
    alignItems: 'center',
    backgroundColor: '#047857',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: 24
  },
  permissionButtonText: {
    color: '#ffffff'
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    position: 'absolute',
    right: 0,
    top: 0
  },
  topTitle: {
    color: '#ffffff',
    fontWeight: '700'
  },
  closeButton: {
    alignItems: 'center',
    height: TOUCH_TARGET,
    justifyContent: 'center',
    width: TOUCH_TARGET
  },
  frame: {
    alignSelf: 'center',
    borderColor: '#52d899',
    borderRadius: 18,
    borderWidth: 3,
    height: 220,
    marginTop: 'auto',
    marginBottom: 'auto',
    width: '82%'
  },
  hint: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 24,
    position: 'absolute',
    right: 0
  },
  hintText: {
    color: '#ffffff',
    textAlign: 'center'
  }
})
