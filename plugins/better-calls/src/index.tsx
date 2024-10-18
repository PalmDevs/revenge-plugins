import StorageManager, { type Storage } from 'shared:classes/StorageManager'
import { Stack, TableRow, TableRowGroup, TableSwitchRow, Text, TextLink } from 'shared:components'
import Constants from 'shared:constants'
import { assets } from '@revenge-mod/api'
import { ReactNative, toasts } from '@revenge-mod/metro/common'
import { components } from '@revenge-mod/ui'
import { storage as rawStorage } from '@vendetta/plugin'
import { patch as patchRememberOutputDevice } from './patches/rememberOutputDevice'
import { patch as patchSilentCall } from './patches/silentCall'
import {
    type AudioDevice,
    getAudioDeviceDisplayText,
    getAudioDeviceIcon,
    getAudioDevices,
    showAudioOutputDevicesSelectionSheet,
} from './utils'

type PluginStorageStruct = Storage<
    {
        silentCall: {
            enabled: boolean
            users: Record<string, boolean | undefined>
            default: boolean
        }
        rememberOutputDevice: {
            enabled: boolean
            device?: AudioDevice
        }
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
        // Migration code
        if (rawStorage.v)
            return {
                version: 1,
                silentCall: rawStorage.silentCall,
                rememberOutputDevice: rawStorage.rememberOutputDevice,
            }

        return {
            version: 1,
            silentCall: {
                default: false,
                enabled: true,
                users: {},
            },
            rememberOutputDevice: {
                device: undefined,
                enabled: false,
            },
        }
    },
    version: 1,
    migrations: {},
})

export const unpatches: {
    silentCall: UnpatchFunction[]
    rememberOutputDevice: UnpatchFunction[]
} = {
    silentCall: [],
    rememberOutputDevice: [],
}

export default {
    onLoad: () => {
        onModuleStatusUpdate(true)
    },
    onUnload: () => {
        for (const unpatch of unpatches.silentCall) unpatch()
        for (const unpatch of unpatches.rememberOutputDevice) unpatch()
    },
    settings: () => {
        const [_, forceUpdate] = React.useReducer(x => ~x, 0)
        const onUpdate = () => {
            onModuleStatusUpdate()
            forceUpdate()
        }

        return (
            <components.ErrorBoundary>
                <ReactNative.ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
                    <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                        <Stack spacing={12}>
                            <TableRowGroup title="Silent Call">
                                <TableSwitchRow
                                    icon={<TableRow.Icon source={assets.findAssetId('ic_notif_off')} />}
                                    label="Enable Silent Call"
                                    subLabel="Silently call someone without ringing, configurable per user."
                                    value={storage.get('silentCall.enabled')}
                                    onValueChange={(v: boolean) => {
                                        storage.set('silentCall.enabled', v)
                                        onUpdate()
                                    }}
                                />
                                <TableSwitchRow
                                    icon={<TableRow.Icon source={assets.findAssetId('ic_call_ended')} />}
                                    label="Ring by default"
                                    subLabel="Ring people by default unless you set otherwise. This will affect unset preferences."
                                    value={!storage.get('silentCall.default')}
                                    onValueChange={(v: boolean) => {
                                        storage.set('silentCall.default', !v)
                                        onUpdate()
                                    }}
                                />
                                <TableRow
                                    variant="danger"
                                    icon={
                                        <TableRow.Icon
                                            variant="danger"
                                            source={assets.findAssetId('ic_message_delete')}
                                        />
                                    }
                                    label="Reset preferences"
                                    subLabel="Reset all silent call preferences, this will make you ring people by default again."
                                    onPress={() => {
                                        storage.set('silentCall.users', {})
                                        toasts.open({
                                            key: 'better-calls:silent-call-reset',
                                            content: 'Silent call preferences have been reset',
                                            icon: assets.findAssetId('ic_message_delete'),
                                        })
                                    }}
                                />
                            </TableRowGroup>
                            <Text variant="text-xs/normal" color="TEXT_MUTED">
                                You may need to switch between DMs and servers for the changes to take effect. This is
                                because Discord caches rendered components.
                            </Text>
                        </Stack>
                        <Stack spacing={12}>
                            <TableRowGroup title="Remember Audio Output Device">
                                <TableSwitchRow
                                    icon={<TableRow.Icon source={assets.findAssetId('voice_bar_speaker_new')} />}
                                    label="Remember audio output device"
                                    subLabel="Remembers your audio output device preferences."
                                    value={storage.get('rememberOutputDevice.enabled')}
                                    onValueChange={(v: boolean) => {
                                        storage.set('rememberOutputDevice.enabled', v)
                                        onUpdate()
                                    }}
                                />
                                <TableRow
                                    disabled={!storage.get('rememberOutputDevice.enabled')}
                                    icon={
                                        <TableRow.Icon
                                            source={getAudioDeviceIcon(
                                                storage.get('rememberOutputDevice.device.simpleDeviceType') ??
                                                    'INVALID',
                                            )}
                                        />
                                    }
                                    label="Current device"
                                    subLabel={
                                        storage.get('rememberOutputDevice.device')
                                            ? `${storage.get('rememberOutputDevice.device.deviceName')} - ${getAudioDeviceDisplayText(storage.get('rememberOutputDevice.device')!)}`
                                            : 'No device'
                                    }
                                    arrow
                                    onPress={() =>
                                        showAudioOutputDevicesSelectionSheet({ onPress: forceUpdate, storage })
                                    }
                                />
                            </TableRowGroup>
                            <Text variant="text-xs/normal" color="TEXT_MUTED">
                                If your device is not persistent, the first device will be selected after the preferred
                                device is removed.
                            </Text>
                            <Text variant="text-xs/normal" color="TEXT_MUTED">
                                This also replaces the audio output device selection sheet which means it may be missing
                                features such as transferring voice chats to a console. If you need those features, let
                                me know by{' '}
                                <TextLink url={Constants.Repository.FeatureRequestURL}>
                                    making a feature request
                                </TextLink>
                                .
                            </Text>
                            <Text variant="text-xs/normal" color="TEXT_MUTED">
                                Alternatively, you can swipe up the dock in the voice call UI and access the{' '}
                                <Text variant="text-xs/bold">Change Audio Output</Text> option.
                            </Text>
                        </Stack>
                    </Stack>
                </ReactNative.ScrollView>
            </components.ErrorBoundary>
        )
    },
}

// TODO: Maybe force rerender of PrivateChannelButtons
function onModuleStatusUpdate(_firstRun?: boolean) {
    const devices = getAudioDevices()
    const currentDevice = storage.get('rememberOutputDevice.device')

    if (!currentDevice) storage.set('rememberOutputDevice.device', devices[0])
    // Checks if the saved device is still available
    else if (!devices.some(d => d.deviceId === currentDevice.deviceId && d.deviceType === currentDevice.deviceType))
        storage.set('rememberOutputDevice.device', devices[0])

    if (!storage.get('silentCall.enabled')) {
        for (const unpatch of unpatches.silentCall) unpatch()
        unpatches.silentCall = []
    } else if (!unpatches.silentCall.length) patchSilentCall(storage, unpatches.silentCall)

    if (!storage.get('rememberOutputDevice.enabled')) {
        for (const unpatch of unpatches.rememberOutputDevice) unpatch()
        unpatches.rememberOutputDevice = []
    } else if (!unpatches.rememberOutputDevice.length)
        patchRememberOutputDevice(storage, unpatches.rememberOutputDevice)
}
