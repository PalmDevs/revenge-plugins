import { showActionSheet } from 'shared:sheets'
import type { PluginStorage } from '.'
import AudioOutputDevicesSelectionSheet from './components/AudioOutputDevicesSelectionSheet'

const { metro } = bunny

export type SimpleAudioDeviceType = 'EARPIECE' | 'BLUETOOTH_HEADSET' | 'WIRED_HEADSET' | 'SPEAKERPHONE' | 'INVALID'
export type AudioDevice = {
    deviceName: string
    deviceId: number
    simpleDeviceType: SimpleAudioDeviceType
    deviceType: number
}

export const getAudioDevices = () => {
    const { getAudioDevices: _get } = metro.findByPropsLazy('getAudioDevices')

    return _get() as AudioDevice[]
}

export const setAudioOutputDevice = (device: AudioDevice) => {
    const { setAudioOutputDevice } = metro.findByPropsLazy('setAudioOutputDevice')
    setAudioOutputDevice(device)
}

export const getAudioDeviceIcon = (simpleDeviceType: SimpleAudioDeviceType) => {
    const { audioDeviceToIconMap } = metro.findByPropsLazy('audioDeviceToIconMap')
    return audioDeviceToIconMap[simpleDeviceType]
}

export const getAudioDeviceDisplayText = (device: Pick<AudioDevice, 'deviceType'>) => {
    const { getAudioDeviceToDisplayText } = metro.findByPropsLazy('getAudioDeviceToDisplayText')
    return getAudioDeviceToDisplayText(device)
}

export const showAudioOutputDevicesSelectionSheet = (props: {
    vstorage: PluginStorage
    onPress?: () => void
    fromVoiceCall?: boolean
}) => {
    showActionSheet(
        'better-calls:audio-output-devices-select',
        Promise.resolve({
            default: () => (
                <bunny.ui.components.ErrorBoundary>
                    <AudioOutputDevicesSelectionSheet {...props} />
                </bunny.ui.components.ErrorBoundary>
            ),
        }),
    )
}
