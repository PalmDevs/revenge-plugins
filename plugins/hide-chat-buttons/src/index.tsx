import { assets, patcher } from '@revenge-mod/api'
import { findByNameLazy, findByPropsLazy } from '@revenge-mod/metro'
import { ReactNative } from '@revenge-mod/metro/common'
import { components } from '@revenge-mod/ui'
import { findInReactTree } from '@revenge-mod/utils'
import { storage as rawStorage } from '@vendetta/plugin'

import StorageManager, { type Storage } from 'shared:classes/StorageManager'
import { Stack, TableRadioGroup, TableRadioRow, TableRow, TableRowGroup, TableSwitchRow } from 'shared:components'

type PluginStorageStruct = Storage<
    {
        hide: {
            voice: boolean
            gift: boolean
            thread: boolean
            app: boolean,
        }
        neverDismiss: boolean
    },
    2
>

export type PluginStorage = typeof storage

export const storage = new StorageManager<
    PluginStorageStruct,
    {
        1: Storage<PluginStorageStruct['hide'], 1>
        2: PluginStorageStruct
    }
>({
    storage: rawStorage as PluginStorageStruct,
    initialize() {
        return {
            version: 2,
            hide: {
                app: true,
                gift: true,
                thread: true,
                voice: true,
            },
            neverDismiss: true,
        }
    },
    version: 2,
    migrations: {
        1: ({ version, ...oldStorage }) => {
            return {
                hide: oldStorage,
                neverDismiss: true,
            }
        }
    },
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
                if (props.canSendVoiceMessage) props.canSendVoiceMessage = !storage.get('hide.voice')
                if (props.canStartThreads) props.canStartThreads = !storage.get('hide.thread')
                if (props.isAppLauncherEnabled) props.isAppLauncherEnabled = !storage.get('hide.app')

                // For some ungodly reason, this cannot be done right in parent ChatInput
                // so I had to waste my time trying to find the child component
                // Why does this prop even exist if it's gonna persistently show anyways???
                ChatInput.defaultProps.hideGiftButton = storage.get('hide.gift')
            }),
        )

        unpatches.push(
            patcher.after('render', ChatInput.prototype, (_, tree) => {
                // biome-ignore lint/suspicious/noExplicitAny: No.
                const input = findInReactTree(tree, (t: any) => 'forceAnimateButtons' in t.props)
                input.props.forceAnimateButtons = storage.get('neverDismiss')
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
                        <TableRowGroup title="Hide Buttons">
                            {(
                                [
                                    ['app launcher', 'AppsIcon', 'app'],
                                    ['gift button', 'ic_gift', 'gift'],
                                    ['create thread button', 'ThreadPlusIcon', 'thread'],
                                    ['voice message button', 'MicrophoneIcon', 'voice'],
                                ] as Array<[name: string, icon: string, key: keyof PluginStorageStruct['hide']]>
                            ).map(([label, icon, key]) => (
                                <TableSwitchRow
                                    key={key}
                                    icon={<TableRow.Icon source={assets.findAssetId(icon)} />}
                                    label={`Hide ${label}`}
                                    value={storage.get(`hide.${key}`)}
                                    onValueChange={(v: boolean) => {
                                        storage.set(`hide.${key}`, v)
                                        forceUpdate()
                                    }}
                                />
                            ))}
                        </TableRowGroup>
                        <TableRadioGroup
                            title="Collapse Behavior"
                            value={storage.get('neverDismiss')}
                            onChange={(v: boolean) => {
                                storage.set('neverDismiss', v)
                                forceUpdate()
                            }}
                        >
                            <TableRadioRow label="Never collapse" value={true} />
                            <TableRadioRow label="Collapse while typing" value={false} />
                        </TableRadioGroup>
                    </Stack>
                </ReactNative.ScrollView>
            </components.ErrorBoundary>
        )
    },
}
