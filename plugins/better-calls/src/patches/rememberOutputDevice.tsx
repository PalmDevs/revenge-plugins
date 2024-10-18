import { IconButton } from 'shared:components'
import { patcher } from '@revenge-mod/api'
import { findByTypeNameLazy } from '@revenge-mod/metro'
import type { PluginStorage } from '..'
import { getAudioDeviceIcon, setAudioOutputDevice, showAudioOutputDevicesSelectionSheet } from '../utils'

export const patch = (storage: PluginStorage, unpatches: UnpatchFunction[]) => {
    const VoicePanelHeaderSpeaker = findByTypeNameLazy('VoicePanelHeaderSpeaker')

    unpatches.push(
        patcher.after('type', VoicePanelHeaderSpeaker, args => {
            if (args[0].isConnectedToVoiceChannel) {
                setAudioOutputDevice(storage.get('rememberOutputDevice.device')!)
                return (
                    <IconButton
                        key="better-calls:silent-call-toggle"
                        icon={getAudioDeviceIcon(storage.get('rememberOutputDevice.device.simpleDeviceType'))}
                        onPress={() => showAudioOutputDevicesSelectionSheet({ storage, fromVoiceCall: true })}
                        variant="primary-overlay"
                        size="sm"
                    />
                )
            }
        }),
    )

    return unpatches
}
