import { assets, patcher } from '@revenge-mod/api'
import { findByNameLazy, findByPropsLazy } from '@revenge-mod/metro'
import { ReactNative } from '@revenge-mod/metro/common'
import { components } from '@revenge-mod/ui'
import { findInReactTree } from '@revenge-mod/utils'
import { storage as rawStorage } from '@vendetta/plugin'

import StorageManager, { type Storage } from 'shared:classes/StorageManager'
import { Stack, TableRow, TableRowGroup, TableSwitchRow } from 'shared:components'
import { inspect } from 'shared:utils'

type PluginStorageStruct = Storage<
    {
        voice: boolean
        gift: boolean
        thread: boolean
        app: boolean
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
            version: 1,
            app: true,
            gift: true,
            thread: true,
            voice: true,
        }
    },
    version: 1,
    migrations: {},
})

const unpatches: UnpatchFunction[] = []

export default {
    onLoad: () => {
        /*
            The component structure looks like:

            <ParentChatInput>
                <...>
                    <ChatInput />
                </...>
            </ParentChatInput>

            (yes, they're both named ChatInput)
        */
        const { default: ParentChatInput } = findByPropsLazy('ChatInput')
        const ChatInput = findByNameLazy('ChatInput')

        const intialHideGiftInputValue = ChatInput.defaultProps.hideGiftButton

        unpatches.push(
            patcher.after('render', ParentChatInput, (_, tree) => {
                const props = tree.props.children.props
                if (props.canSendVoiceMessage) props.canSendVoiceMessage = !storage.get('voice')
                if (props.canStartThreads) props.canStartThreads = !storage.get('thread')
                if (props.isAppLauncherEnabled) props.isAppLauncherEnabled = !storage.get('app')

                // For some ungodly reason, this cannot be done right in parent ChatInput
                // so I had to waste my time trying to find the child component
                // Why does this prop even exist if it's gonna persistently show anyways???
                ChatInput.defaultProps.hideGiftButton = storage.get('gift')
            }),
        )

        unpatches.push(() => {
            ChatInput.defaultProps.hideGiftButton = intialHideGiftInputValue
        })
    },
    onUnload: () => {
        for (const unpatch of unpatches) unpatch()
    },
    settings: () => {
        const [_, forceUpdate] = React.useReducer(x => ~x, 0)

        return (
            <components.ErrorBoundary>
                <ReactNative.ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
                    <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                        <TableRowGroup title="Chat Buttons">
                            {(
                                [
                                    ['app launcher', 'AppsIcon', 'app'],
                                    ['gift button', 'ic_gift', 'gift'],
                                    ['create thread button', 'ThreadPlusIcon', 'thread'],
                                    ['voice message button', 'MicrophoneIcon', 'voice'],
                                ] as Array<[name: string, icon: string, key: keyof PluginStorageStruct]>
                            ).map(([label, icon, key]) => (
                                <TableSwitchRow
                                    key={key}
                                    icon={<TableRow.Icon source={assets.findAssetId(icon)} />}
                                    label={`Hide ${label}`}
                                    value={storage.get(key)}
                                    onValueChange={(v: boolean) => {
                                        storage.set(key, v)
                                        forceUpdate()
                                    }}
                                />
                            ))}
                        </TableRowGroup>
                    </Stack>
                </ReactNative.ScrollView>
            </components.ErrorBoundary>
        )
    },
}
