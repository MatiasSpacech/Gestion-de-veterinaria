import { createTheme, type MantineColorsTuple } from '@mantine/core'

const vetGreen: MantineColorsTuple = [
  '#eefcf5',
  '#d8f6e7',
  '#abeccd',
  '#7ae1b0',
  '#52d899',
  '#39d28b',
  '#2ad084',
  '#18b870',
  '#08a361',
  '#008c50'
]

export const theme = createTheme({
  primaryColor: 'vetGreen',
  primaryShade: 7,
  colors: {
    vetGreen
  },
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: '700'
  },
  components: {
    Paper: {
      defaultProps: {
        radius: 'lg'
      }
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        withBorder: true
      }
    },
    Button: {
      defaultProps: {
        radius: 'md'
      }
    },
    TextInput: {
      defaultProps: {
        radius: 'md'
      }
    },
    PasswordInput: {
      defaultProps: {
        radius: 'md'
      }
    }
  }
})
