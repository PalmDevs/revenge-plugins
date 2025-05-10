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
        show: {
            thread: boolean
        }
        dismiss: {
            actions: boolean
            send: boolean
        }
    },
    4
>

type PluginStorageStructV3 = Omit<PluginStorageStruct, 'dismiss'> & { neverDismiss: boolean }

export type PluginStorage = typeof storage

export const storage = new StorageManager<
    PluginStorageStruct,
    {
        1: Storage<PluginStorageStructV3['hide'], 1>
        2: Omit<PluginStorageStructV3, 'show'>
        3: PluginStorageStructV3
        4: PluginStorageStruct
    }
>({
    storage: rawStorage as PluginStorageStruct,
    initialize() {
        return {
            version: 4,
            hide: {
                app: true,
                gift: true,
                thread: true,
                voice: true,
            },
            show: {
                thread: false,
            },
            dismiss: {
                actions: true,
                send: false,
            },
        }
    },
    version: 4,
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

        let hasText = true
        let sendBtnRef: React.MutableRefObject<{ setHasText(hasText: boolean): void }>
        let actionsRef: React.MutableRefObject<{ onShowActions(): void; onDismissActions(): void }>

        unpatches.push(
            // forwardRef moment
            patcher.before('render', ChatInputSendButton.type, ([props, ref]) => {
                if (props.canSendVoiceMessage) props.canSendVoiceMessage = !storage.get('hide.voice')

                sendBtnRef = ref
            }),
            // forwardRef moment
            patcher.before('render', ChatInputActions.type, ([props, ref]) => {
                if (props.isAppLauncherEnabled) props.isAppLauncherEnabled = !storage.get('hide.app')
                props.canStartThreads = storage.get('show.thread') || !storage.get('hide.thread')
                props.shouldShowGiftButton = !storage.get('hide.gift')

                actionsRef = ref
            }),
            patcher.after('render', ChatInputActions.type, () => {
                // ref is only accessible after a render
                // We wait do double setImmediate to make sure the ref is really set
                setImmediate(() =>
                    setImmediate(() => {
                        // In case it wasn't set (happens in Bot DMs)
                        if (actionsRef?.current) {
                            const { onDismissActions } = actionsRef.current
                            unpatches.push(() => (actionsRef.current.onDismissActions = onDismissActions))
                            actionsRef.current.onDismissActions = () => {
                                if (storage.get('dismiss.actions')) return onDismissActions()
                            }
                        }
                    }),
                )
            }),
            patcher.after('render', ChatInputSendButton.type, () => {
                // ref is only accessible after a render
                // We wait do double setImmediate to make sure the ref is really set
                setImmediate(() =>
                    setImmediate(() => {
                        // In case it wasn't set (happens in Bot DMs)
                        if (sendBtnRef?.current) {
                            const { setHasText } = sendBtnRef.current
                            unpatches.push(() => (sendBtnRef.current.setHasText = setHasText))
                            sendBtnRef.current.setHasText = (hasText_: boolean) => {
                                if (storage.get('dismiss.send')) hasText = hasText_
                                return setHasText(hasText_)
                            }
                        }
                    }),
                )

                if (!hasText) return <ReactNative.View />
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
                                ['Gift', 'ic_gift', 'gift'],
                                ['New Thread', 'ThreadPlusIcon', 'thread'],
                                ['Voice Message', 'MicrophoneIcon', 'voice'],
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
                        title="Action Buttons Collapse Behavior"
                        defaultValue={storage.get('dismiss.actions')}
                        onChange={(v: boolean) => {
                            storage.set('dismiss.actions', v)
                            forceUpdate()
                        }}
                    >
                        <TableRadioRow label="Never collapse" value={false} />
                        <TableRadioRow
                            label="Collapse while typing"
                            subLabel="Collapse action buttons when you start typing."
                            value={true}
                        />
                    </TableRadioGroup>
                    <TableRadioGroup
                        title="Send Button Collapse Behavior"
                        defaultValue={storage.get('dismiss.send')}
                        onChange={(v: boolean) => {
                            storage.set('dismiss.send', v)
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
                </Stack>
            </ReactNative.ScrollView>
        )
    },
}
