import { StyleSheet } from 'react-native'
import { TextInput, type TextInputProps } from 'react-native-paper'

export function AppTextInput({ mode, style, contentStyle, ...props }: TextInputProps) {
  return (
    <TextInput
      {...props}
      mode={mode ?? 'outlined'}
      style={[styles.input, style]}
      contentStyle={[styles.content, contentStyle]}
    />
  )
}

const styles = StyleSheet.create({
  input: {
    minHeight: 56
  },
  content: {
    minHeight: 48,
    paddingVertical: 0
  }
})
