import { showActionSheet } from 'shared:sheets'
import { findByPropsLazy } from '@revenge-mod/metro'
import { components } from '@revenge-mod/ui'
import type { PluginStorage } from '.'
import AudioOutputDevicesSelectionSheet from './components/AudioOutputDevicesSelectionSheet'

const { getAudioDevices: _get } = findByPropsLazy('getAudioDevices')
const { setAudioOutputDevice: setOutputDevice } = findByPropsLazy('setAudioOutputDevice')
const { audioDeviceToIconMap, getAudioDeviceToDisplayText } = findByPropsLazy('audioDeviceToIconMap')

export type SimpleAudioDeviceType = 'EARPIECE' | 'BLUETOOTH_HEADSET' | 'WIRED_HEADSET' | 'SPEAKERPHONE' | 'INVALID'
export type AudioDevice = {
    deviceName: string
    deviceId: number
    simpleDeviceType: SimpleAudioDeviceType
    deviceType: number
}

export const getAudioDevices = () => _get() as AudioDevice[]
export const setAudioOutputDevice = (device: AudioDevice) => setOutputDevice(device)
export const getAudioDeviceIcon = (simpleDeviceType: SimpleAudioDeviceType) => audioDeviceToIconMap[simpleDeviceType]
export const getAudioDeviceDisplayText = (device: Pick<AudioDevice, 'deviceType'>) =>
    getAudioDeviceToDisplayText(device)

export const showAudioOutputDevicesSelectionSheet = (props: {
    storage: PluginStorage
    onPress?: () => void
    fromVoiceCall?: boolean
}) => {
    showActionSheet(
        'better-calls:audio-output-devices-select',
        Promise.resolve({
            default: () => (
                <components.ErrorBoundary>
                    <AudioOutputDevicesSelectionSheet {...props} />
                </components.ErrorBoundary>
            ),
        }),
    )
}
