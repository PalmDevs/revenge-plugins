declare module '@revenge-mod/api' {
    const api: typeof import('./node_modules/@revenge-mod/revenge/src/lib/api')
    export * from './node_modules/@revenge-mod/revenge/src/lib/api'
    export default api
}

declare module '@revenge-mod/metro' {
    const metro: typeof import('./node_modules/@revenge-mod/revenge/src/metro')
    export * from './node_modules/@revenge-mod/revenge/src/metro'
    export default metro
}

declare module '@revenge-mod/metro/common' {
    const common: typeof import('./node_modules/@revenge-mod/revenge/src/metro/common')
    export * from './node_modules/@revenge-mod/revenge/src/metro/common'
    export default common
}

declare module '@revenge-mod/ui' {
    const ui: typeof import('./node_modules/@revenge-mod/revenge/src/lib/ui')
    export * from './node_modules/@revenge-mod/revenge/src/lib/ui'
    export default ui
}
declare module '@revenge-mod/utils' {
    const utils: typeof import('./node_modules/@revenge-mod/revenge/src/lib/utils')
    export * from './node_modules/@revenge-mod/revenge/src/lib/utils'
    export default utils
}

declare module '@revenge-mod/utils/lazy' {
    export const lazy: typeof import('./node_modules/@revenge-mod/revenge/src/lib/utils/lazy')
    export * from './node_modules/@revenge-mod/revenge/src/lib/utils/lazy'
    export default lazy
}
