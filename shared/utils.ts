import { findByPropsLazy } from '@revenge-mod/metro'
import { proxyLazy } from '@revenge-mod/utils/lazy'

export const findPropLazy = (prop: string) => proxyLazy(() => findByPropsLazy(prop)[prop])

export const inspect = findPropLazy('inspect')
