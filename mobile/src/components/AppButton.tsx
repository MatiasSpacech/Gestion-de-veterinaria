import { StyleSheet } from 'react-native'
import { Button, type ButtonProps } from 'react-native-paper'

import { RADIUS, TOUCH_TARGET } from '../theme/tokens'

export function AppButton({ mode, style, contentStyle, ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      mode={mode ?? 'contained'}
      style={[styles.button, style]}
      contentStyle={[styles.content, contentStyle]}
    />
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.md
  },
  content: {
    minHeight: TOUCH_TARGET
  }
})
