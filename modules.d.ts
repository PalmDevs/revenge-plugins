declare module '@revenge-mod/api' {
    const api: typeof import('@revenge-mod/revenge/src/lib/api')
    export * from '@revenge-mod/revenge/src/lib/api'
    export default api
}

declare module '@revenge-mod/metro' {
    const metro: typeof import('@revenge-mod/revenge/src/metro')
    export * from '@revenge-mod/revenge/src/metro'
    export default metro
}

declare module '@revenge-mod/metro/common' {
    const common: typeof import('@revenge-mod/revenge/src/metro/common')
    export * from '@revenge-mod/revenge/src/metro/common'
    export default common
}

declare module '@revenge-mod/ui' {
    const ui: typeof import('@revenge-mod/revenge/src/lib/ui')
    export * from '@revenge-mod/revenge/src/lib/ui'
    export default ui
}
declare module '@revenge-mod/utils' {
    const utils: typeof import('@revenge-mod/revenge/src/lib/utils')
    export * from '@revenge-mod/revenge/src/lib/utils'
    export default utils
}

declare module '@revenge-mod/utils/lazy' {
    export const lazy: typeof import('@revenge-mod/revenge/src/lib/utils/lazy')
    export * from '@revenge-mod/revenge/src/lib/utils/lazy'
    export default lazy
}
