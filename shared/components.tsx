// From Bunny's codebase

import { TextStyleSheet, resolveSemanticColor, semanticColors } from 'shared:themes'
import { findPropLazy } from 'shared:utils'
import type { DiscordTextStyles } from '@revenge-mod/revenge/src/lib/ui/types'
import type { Nullish } from '@revenge-mod/revenge/src/lib/utils/types'
import type { ReactNode } from 'react'
import type * as RN from 'react-native'
import type { ImageSourcePropType, PressableProps } from 'react-native'
import type { LiteralUnion } from 'type-fest'

const {
    metro: { findByProps, findByPropsLazy },
    utils: {
        lazy: { proxyLazy, lazyDestructure },
    },
} = bunny

// React Native's included SafeAreaView only adds padding on iOS.
export const SafeAreaView = proxyLazy(() => findByPropsLazy('useSafeAreaInsets').SafeAreaView)

// Buttons & Tables & Inputs
export const {
    Button,
    IconButton,
    TableRow,
    TableRowTrailingText,
    TableRowGroup,
    TableSwitchRow,
    TableSwitch,
    TableRadioRow,
    TableRadioGroup,
    TableCheckbox,
    TextInput,
} = findByPropsLazy('Button', 'IconButton', 'TableRow') as {
    Button: Button
    IconButton: IconButton
    TextInput: TextInput
    TableRow: React.FC<any> & { Icon: React.FC<any> }
} & { [K in string]: React.FC<any> }

// Sheets

export const { ActionSheet } = findByProps('ActionSheet') as { ActionSheet: ActionSheet }
export const ActionSheetRow = findByProps('ActionSheetRow')
export const BottomSheetTitleHeader = findPropLazy('BottomSheetTitleHeader')

export const { FormSwitch, FormRadio, FormCheckbox } = lazyDestructure(() =>
    findByPropsLazy('FormSwitch', 'FormRadio', 'FormCheckbox'),
)

// Misc.

export function Text(props: React.PropsWithChildren<TextProps>) {
    const { children, variant, color, style, lineClamp = 0 } = props

    return (
        <ReactNative.Text
            {...props}
            style={[
                variant ? TextStyleSheet[variant] : {},
                color ? { color: resolveSemanticColor(semanticColors[color]) } : {},
                style ?? {},
            ]}
            numberOfLines={lineClamp}
        >
            {children}
        </ReactNative.Text>
    )
}

const IntlLink = findPropLazy('IntlLink')

export function TextLink(props: TextLinkProps) {
    // biome-ignore lint/correctness/noChildrenProp: Need to coerce array, no thank you
    return <IntlLink children={[props.children]} target={props.url} />
}

export interface TextLinkProps {
    children: string
    url: string
}

export const Stack = findPropLazy('Stack') as Stack

export const FlashList = findPropLazy('FlashList')

type Style = RN.ViewStyle & RN.ImageStyle & RN.TextStyle

type InteractiveSize = 'sm' | 'md' | 'lg'

// Buttons
type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'destructive'
    | 'active'
    | 'primary-overlay'
    | 'secondary-overlay'

interface ButtonProps {
    disabled?: boolean
    onPress: () => void
    loading?: boolean
    variant?: LiteralUnion<ButtonVariant, string>
    text?: string
    size?: LiteralUnion<InteractiveSize, string>
    iconPosition?: 'start' | 'end'
    scaleAmountInPx?: number
    icon?: ImageSourcePropType | ReactNode
    style?: Style
}

export type Button = React.ForwardRefExoticComponent<ButtonProps>

interface TextInputProps extends Omit<RN.TextInputProps, 'onChange' | 'onChangeText' | 'value'> {
    defaultValue?: string
    description?: string
    editable?: boolean
    errorMessage?: string
    focusable?: boolean
    grow?: boolean
    isCentered?: boolean
    isClearable?: boolean
    isDisabled?: boolean
    isRound?: boolean
    label?: string
    leadingIcon?: React.FC<any>
    leadingPressableProps?: PressableProps
    leadingText?: string
    onChange?: (text: string) => void
    size?: 'sm' | 'md' | 'lg'
    state?: 'error' | 'default'
    style?: Style
    trailingIcon?: React.FC<any>
    trailingPressableProps?: PressableProps
    trailingText?: string
    value?: string | Nullish
}

export type TextInput = React.FC<TextInputProps>

interface StackProps {
    /** defaults to vertical */
    direction?: 'vertical' | 'horizontal'
    /** defaults to 8 */
    spacing?: number
}

export type Stack = React.FC<React.PropsWithChildren<StackProps> & RN.ViewProps>

interface ActionSheetProps {
    onClose?: () => void
    children: React.ReactNode
}

export type ActionSheet = React.FC<React.PropsWithChildren<ActionSheetProps>>

type TextProps = React.ComponentProps<typeof RN.Text> & {
    variant?: DiscordTextStyles
    color?: string // TODO: type this
    lineClamp?: number
    maxFontSizeMultiplier?: number
    style?: RN.TextStyle
}

export type Text = React.FC<TextProps>

interface IconButtonProps {
    icon: ImageSourcePropType | ReactNode
    onPress: () => void
    disabled?: boolean
    size?: InteractiveSize
    variant?: ButtonVariant
    style?: Style
}

export type IconButton = React.FC<IconButtonProps>
