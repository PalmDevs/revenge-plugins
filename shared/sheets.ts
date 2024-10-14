import { findPropLazy } from 'shared:utils'
import { findByPropsLazy } from '@revenge-mod/metro'

const actionSheet = findByPropsLazy('openLazy', 'hideActionSheet')
const showSimpleActionSheet = findPropLazy('showSimpleActionSheet') as {
    showSimpleActionSheet: (props: {
        key: string
        header: {
            title: string
            icon?: React.ReactNode
            onClose?: () => void
        }
        options: {
            label: string
            icon?: number
            isDestructive?: boolean
            onPress?: () => void
        }[]
    }) => void
}

export { showSimpleActionSheet }

export function showActionSheet<T extends React.ComponentType>(
    key: string,
    sheetObjectOrLazyImportedSheet: T | Promise<{ default: T }>,
    props?: React.ComponentProps<T>,
) {
    actionSheet.openLazy(sheetObjectOrLazyImportedSheet, key, props ?? {})
}

export function hideActionSheet(key: string) {
    actionSheet.hideActionSheet(key)
}
