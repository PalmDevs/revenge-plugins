import type * as revenge from '@revenge-mod/revenge/src/lib'

declare module '@revenge-mod/revenge' {
    export * from '@revenge-mod/revenge/src/lib'
    export default revenge
}

declare global {
    const bunny: typeof revenge
    const React: typeof import('react')
    const ReactNative: typeof import('react-native')

    type UnpatchFunction = () => void
}
