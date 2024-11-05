import { findPropLazy } from 'shared:utils'
import { findByPropsLazy, findByStoreNameLazy } from '@revenge-mod/metro'
import { constants } from '@revenge-mod/metro/common'
// import { color } from '@revenge-mod/ui'

import type { ReactNative } from '@revenge-mod/metro/common'

const color = findByPropsLazy('SemanticColor')

// export const { resolveSemanticColor, semanticColors } = color
export const semanticColors = (color?.default?.colors ?? constants?.ThemeColorMap) as Record<string, any>
export const rawColors = (color?.default?.unsafe_rawColors ?? constants?.Colors) as Record<string, string>

const colorResolver = (color.default.meta ??= color.default.internal)

export function isSemanticColor(sym: any): boolean {
    return colorResolver.isSemanticColor(sym)
}

export function resolveSemanticColor(sym: any, theme = ThemeStore.theme): string {
    return colorResolver.resolveSemanticColor(theme, sym)
}

export const ThemeStore = findByStoreNameLazy('ThemeStore')
export const TextStyleSheet = findPropLazy('TextStyleSheet') as TextStyleSheet

export type TextStyleSheetWeight = 'normal' | 'medium' | 'semibold' | 'bold'

type TextStyleSheetSizeWithExtraBoldWeight =
    | 'heading-sm'
    | 'heading-md'
    | 'heading-lg'
    | 'heading-xl'
    | 'heading-xxl'
    | 'heading-deprecated-12'

export type TextStyleSheetWithWeight =
    | TextStyleSheetSizeWithExtraBoldWeight
    | 'text-xxs'
    | 'text-xs'
    | 'text-sm'
    | 'text-md'
    | 'text-lg'
    | 'redesign/message-preview'
    | 'redesign/channel-title'

export type TextStyleSheetVariant =
    | `${TextStyleSheetWithWeight}/${TextStyleSheetWeight}`
    | `${TextStyleSheetSizeWithExtraBoldWeight}/${TextStyleSheetWeight | 'extrabold'}`
    | 'eyebrow'
    | 'redesign/heading-18/bold'
    | 'display-sm'
    | 'display-md'
    | 'display-lg'

type TextStyleSheet = Record<TextStyleSheetVariant, React.ComponentProps<typeof ReactNative.Text>['style']>
