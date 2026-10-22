import { useWindowDimensions } from 'react-native'

import { contentMaxWidth, gridColumns, isLandscape, isTabletWidth } from './layout'

export interface ResponsiveLayout {
  width: number
  height: number
  isTablet: boolean
  isLandscape: boolean
  contentMaxWidth: number
  columns: number
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions()
  const isTablet = isTabletWidth(width)

  return {
    width,
    height,
    isTablet,
    isLandscape: isLandscape(width, height),
    contentMaxWidth: contentMaxWidth(width),
    columns: gridColumns(width)
  }
}
