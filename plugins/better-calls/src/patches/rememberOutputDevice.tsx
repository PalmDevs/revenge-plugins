import { IconButton } from 'shared:components'
import type { PluginStorage } from '..'
import { getAudioDeviceIcon, setAudioOutputDevice, showAudioOutputDevicesSelectionSheet } from '../utils'

export const patch = (vstorage: PluginStorage, unpatches: UnpatchFunction[]) => {
    const { api, metro } = bunny

    const VoicePanelHeaderSpeaker = metro.findByTypeNameLazy('VoicePanelHeaderSpeaker')

    unpatches.push(
        api.patcher.after('type', VoicePanelHeaderSpeaker, args => {
            if (args[0].isConnectedToVoiceChannel) {
                setAudioOutputDevice(vstorage.rememberOutputDevice.device)   
                return (
                    <IconButton
                        key="better-calls:silent-call-toggle"
                        icon={getAudioDeviceIcon(vstorage.rememberOutputDevice.device.simpleDeviceType)}
                        onPress={() => showAudioOutputDevicesSelectionSheet({ vstorage, fromVoiceCall: true })}
                        variant="primary-overlay"
                        size="sm"
                    />
                )
            }
        }),
    )

    return unpatches
}
