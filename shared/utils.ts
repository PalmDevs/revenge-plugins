const {
    metro: { findByPropsLazy },
    utils: {
        lazy: { proxyLazy },
    },
} = bunny

export const findPropLazy = (prop: string) => proxyLazy(() => findByPropsLazy(prop)[prop])
