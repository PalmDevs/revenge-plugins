import { assets, patcher } from '@revenge-mod/api'
import metro from '@revenge-mod/metro'
import { React, ReactNative } from '@revenge-mod/metro/common'
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
        collapse: {
            actions: boolean
            send: boolean
        }
    },
    5
>

type PluginStorageStructV3 = Omit<PluginStorageStructV4, 'dismiss' | 'version'> & { neverDismiss: boolean }
type PluginStorageStructV4 = Omit<PluginStorageStruct, 'collapse' | 'version'> & {
    dismiss: { actions: boolean; send: boolean }
    show: { thread: boolean }
}

export type PluginStorage = typeof storage

export const storage = new StorageManager<
    PluginStorageStruct,
    {
        1: Storage<PluginStorageStructV3['hide'], 1>
        2: Omit<PluginStorageStructV3, 'show' | 'version'> & { version: 2 }
        3: PluginStorageStructV3 & { version: 3 }
        4: PluginStorageStructV4 & { version: 4 }
        5: PluginStorageStruct
    }
>({
    storage: rawStorage as PluginStorageStruct,
    initialize() {
        return {
            version: 5,
            hide: {
                app: true,
                gift: true,
                thread: true,
                voice: true,
            },
            collapse: {
                actions: true,
                send: false,
            },
        }
    },
    version: 5,
    migrations: {
        1: ({ version, ...oldStorage }) => {
            return {
                hide: oldStorage,
                neverDismiss: true,
                sendDismiss: false,
            }
        },
        2: old => ({
            ...old,
            show: {
                thread: false,
            },
        }),
        3: old => ({
            ...old,
            dismiss: {
                actions: !old.neverDismiss,
                send: false,
            },
        }),
        4: old => ({
            ...old,
            collapse: {
                actions: old.dismiss.actions,
                send: old.dismiss.send,
            },
        }),
    },
})

const unpatches: UnpatchFunction[] = []

const {
    factories: { createFilterDefinition },
    lazy: { createLazyModule },
} = metro

const byTypeDisplayName = createFilterDefinition<[displayName: string]>(
    ([name], m) => m?.type?.displayName === name,
    ([name]) => `palmdevs.byTypeDisplayName(${name})`,
)

const findByTypeDisplayNameLazy = (displayName: string, expDefault = true) =>
    createLazyModule(expDefault ? byTypeDisplayName(displayName) : byTypeDisplayName.byRaw(displayName))

export default {
    onLoad: () => {
        const ChatInputSendButton = findByTypeDisplayNameLazy('ChatInputSendButton')
        const ChatInputActions = findByTypeDisplayNameLazy('ChatInputActions')
        const ChatInputRightActions = findByTypeDisplayNameLazy('ChatInputRightActions')

        let hasText = true
        let sendBtnRef: React.MutableRefObject<{ setHasText(hasText: boolean): void }>
        let actionsRef: React.MutableRefObject<{ onShowActions(): void; onDismissActions(): void }>

        unpatches.push(
            patcher.before('render', ChatInputSendButton.type, ([props, ref]) => {
                if (props.canSendVoiceMessage) props.canSendVoiceMessage = !storage.get('hide.voice')

                sendBtnRef = ref
            }),

            /// LEGACY

            patcher.before('render', ChatInputActions.type, ([props, ref]) => {
                if (props.isAppLauncherEnabled) props.isAppLauncherEnabled = !storage.get('hide.app')
                props.canStartThreads = !storage.get('hide.thread')
                props.shouldShowGiftButton = !storage.get('hide.gift')

                actionsRef = ref
            }),
            patcher.after('render', ChatInputActions.type, () => {
                // ref is only accessible after a render
                requestAnimationFrame(() => {
                    // In case it wasn't set (happens in Bot DMs)
                    if (actionsRef?.current) {
                        const { onDismissActions } = actionsRef.current
                        unpatches.push(() => (actionsRef.current.onDismissActions = onDismissActions))
                        actionsRef.current.onDismissActions = () => {
                            if (storage.get('collapse.actions')) return onDismissActions()
                        }
                    }
                })
            }),

            /// REDESIGN/VISUAL REFRESH

            patcher.before('render', ChatInputRightActions.type, ([props]) => {
                props.shouldShowGiftButton = !storage.get('hide.gift')
            }),

            patcher.after('render', ChatInputSendButton.type, () => {
                // ref is only accessible after a render
                requestAnimationFrame(() => {
                    // In case it wasn't set (happens in Bot DMs)
                    if (sendBtnRef?.current) {
                        const { setHasText } = sendBtnRef.current
                        unpatches.push(() => (sendBtnRef.current.setHasText = setHasText))
                        sendBtnRef.current.setHasText = (hasText_: boolean) => {
                            if (storage.get('collapse.send')) hasText = hasText_
                            return setHasText(hasText_)
                        }
                    }
                })

                if (!hasText) return null
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
                    <TableRowGroup title="Hide Action Buttons">
                        {(
                            [
                                ['Apps & Commands', 'GameControllerIcon', 'app'],
                                ['Gift', 'GiftIcon', 'gift'],
                                ['New Thread', 'ThreadPlusIcon', 'thread'],
                                ['Voice Message', 'MicrophoneIcon', 'voice'],
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
                        title="Send Button Collapse Behavior"
                        defaultValue={storage.get('collapse.send')}
                        onChange={(v: boolean) => {
                            storage.set('collapse.send', v)
                            forceUpdate()
                        }}
                    >
                        <TableRadioRow label="Never collapse" value={false} />
                        <TableRadioRow
                            label="Collapse when no text"
                            subLabel="Collapse the Send button when the message box is empty."
                            value={true}
                        />
                    </TableRadioGroup>
                    <TableRadioGroup
                        title="Action Buttons Collapse Behavior (Legacy)"
                        defaultValue={storage.get('collapse.actions')}
                        onChange={(v: boolean) => {
                            storage.set('collapse.actions', v)
                            forceUpdate()
                        }}
                    >
                        <TableRadioRow
                            label="Collapse while typing"
                            value={true}
                            subLabel="Collapse action buttons when you start typing. This is now the default and desirable behavior after the Visual Refresh."
                        />
                        <TableRadioRow label="Never collapse" value={false} />
                    </TableRadioGroup>
                </Stack>
            </ReactNative.ScrollView>
        )
    },
}
