import StorageManager, { type Storage } from 'shared:classes/StorageManager'
import { Stack, TableRadioGroup, TableRadioRow } from 'shared:components'
import { patcher } from '@revenge-mod/api'
import { findByPropsLazy } from '@revenge-mod/metro'
import { ReactNative } from '@revenge-mod/metro/common'
import { proxyLazy } from '@revenge-mod/utils/lazy'
import { storage as rawStorage } from '@vendetta/plugin'

type PluginStorageStruct = Storage<
    {
        locale: string
    },
    1
>

export type PluginStorage = typeof storage

export const storage = new StorageManager<
    PluginStorageStruct,
    {
        1: PluginStorageStruct
    }
>({
    storage: rawStorage as PluginStorageStruct,
    initialize() {
        return {
            locale: 'en-GB',
            version: 1,
        }
    },
    version: 1,
    migrations: {},
})

const moment = proxyLazy(() => findByPropsLazy('isMoment'))
const locales = proxyLazy(() => findByPropsLazy('momentLocales').momentLocales) as Record<
    string,
    () => Promise<unknown>
>

const unpatches: UnpatchFunction[] = []
let momentSetLocale: (locale: string) => void

export default {
    onLoad: () => {
        const origLocale = moment.locale()

        // biome-ignore lint/suspicious/noExplicitAny: I hate Bunny typings
        const patchedGetSetLocale = (set: boolean) => (args: unknown[], origFunc: any) => {
            if (args.length === 0) return origFunc()
            if (set) momentSetLocale = origFunc
        }

        unpatches.push(
            patcher.instead('locale', moment, patchedGetSetLocale(true)),
            patcher.instead('lang', moment, patchedGetSetLocale(false)),
            () => momentSetLocale(origLocale),
        )

        onLocaleUpdate(storage.get('locale')!)
    },
    onUnload: () => {
        for (const unpatch of unpatches) unpatch()
    },
    settings: () => {
        const savedLocale = storage.get('locale')
        const [_, forceUpdate] = React.useReducer(x => ~x, 0)

        onLocaleUpdate(savedLocale!)

        return (
            <ReactNative.ScrollView style={{ flex: 1 }}>
                <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }}>
                    <TableRadioGroup
                        title="Locales"
                        value={savedLocale}
                        onChange={(value: string) => {
                            storage.set('locale', value)
                            forceUpdate()
                        }}
                    >
                        {Object.keys(locales).map(locale => {
                            return <TableRadioRow key={locale} label={locale} value={locale} />
                        })}
                    </TableRadioGroup>
                </Stack>
            </ReactNative.ScrollView>
        )
    },
}

const onLocaleUpdate = (newLocale: string) => {
    locales[newLocale!]().then(() => momentSetLocale(newLocale))
}
