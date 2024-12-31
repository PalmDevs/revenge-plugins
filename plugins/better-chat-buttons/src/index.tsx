import { assets, patcher } from '@revenge-mod/api'
import { findByFilePath, findByPropsLazy } from '@revenge-mod/metro'
import { ReactNative } from '@revenge-mod/metro/common'
import { storage as rawStorage } from '@vendetta/plugin'

import StorageManager, { type Storage } from 'shared:classes/StorageManager'
import { Stack, TableRadioGroup, TableRadioRow, TableRow, TableRowGroup, TableSwitchRow } from 'shared:components'

type PluginStorageStruct = Storage<
    {
        hide: {
            voice: boolean
            gift: boolean
            thread: boolean
            app: boolean
        }
        show: {
            thread: boolean
        }
        neverDismiss: boolean
    },
    3
>

export type PluginStorage = typeof storage

export const storage = new StorageManager<
    PluginStorageStruct,
    {
        1: Storage<PluginStorageStruct['hide'], 1>
        2: Omit<PluginStorageStruct, 'show'>
        3: PluginStorageStruct
    }
>({
    storage: rawStorage as PluginStorageStruct,
    initialize() {
        return {
            version: 3,
            hide: {
                app: true,
                gift: true,
                thread: true,
                voice: true,
            },
            show: {
                thread: false,
            },
            neverDismiss: true,
        }
    },
    version: 3,
    migrations: {
        1: ({ version, ...oldStorage }) => {
            return {
                hide: oldStorage,
                neverDismiss: true,
            }
        },
        2: old => ({
            ...old,
            show: {
                thread: false,
            },
        }),
    },
})

const unpatches: UnpatchFunction[] = []

export default {
    onLoad: () => {
        const ChatInput = findByPropsLazy('ChatInput')
        const ChatInputActions = findByFilePath('modules/chat_input/native/action_buttons/ChatInputActions.tsx')

        unpatches.push(
            patcher.after('render', ChatInput.default, (_, tree) => {
                const props = tree.props.children.props
                if (props.canSendVoiceMessage) props.canSendVoiceMessage = !storage.get('hide.voice')
                if (props.canStartThreads) props.canStartThreads = !storage.get('hide.thread')
                if (props.isAppLauncherEnabled) props.isAppLauncherEnabled = !storage.get('hide.app')
            }),
        )

        unpatches.push(
            patcher.before('render', ChatInputActions.default.type, ([props]) => {
                // TODO: Test if it works, try props.hideAppsButton also
                // props.isAppLauncherEnabled = !storage.get('show.app')

                props.shouldShowThread = storage.get('show.thread')
                props.forceShowActions = storage.get('neverDismiss')
                props.shouldShowGiftButton = !storage.get('hide.gift')

                // I don't know what this button does
                // props.shouldShowHideChatInputButton = true
            }),
        )
    },
    onUnload: () => {
        for (const unpatch of unpatches) unpatch()
    },
    settings: () => {
        const [_, forceUpdate] = React.useReducer(x => ~x, 0)

        return (
            <ReactNative.ScrollView style={{ flex: 1 }}>
                <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                    <TableRowGroup title="Hide Buttons">
                        {(
                            [
                                ['App Launcher button', 'AppsIcon', 'app'],
                                ['Gift button', 'ic_gift', 'gift'],
                                ['New Thread button', 'ThreadPlusIcon', 'thread'],
                                ['Voice Message button', 'MicrophoneIcon', 'voice'],
                            ] as Array<[name: string, icon: string, key: keyof PluginStorageStruct['hide']]>
                        ).map(([label, icon, key]) => (
                            <TableSwitchRow
                                key={key}
                                icon={<TableRow.Icon source={assets.findAssetId(icon)} />}
                                label={`Hide ${label}`}
                                disabled={key === 'thread' && storage.get(`show.${key}`)}
                                value={
                                    key === 'thread' && storage.get(`show.${key}`) ? false : storage.get(`hide.${key}`)
                                }
                                onValueChange={(v: boolean) => {
                                    storage.set(`hide.${key}`, v)
                                    forceUpdate()
                                }}
                            />
                        ))}
                    </TableRowGroup>
                    <TableRowGroup title="Force Show Buttons">
                        <TableSwitchRow
                            icon={<TableRow.Icon source={assets.findAssetId('ThreadPlusIcon')} />}
                            label="Force show New Thread button"
                            subLabel="Show the thread button even when you can't start threads, or when the chat input is not focused"
                            value={storage.get('show.thread')}
                            onValueChange={(v: boolean) => {
                                storage.set('show.thread', v)
                                forceUpdate()
                            }}
                        />
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
        )
    },
}
