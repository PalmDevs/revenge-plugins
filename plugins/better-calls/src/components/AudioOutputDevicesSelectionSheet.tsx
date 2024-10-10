import {
    ActionSheet,
    BottomSheetTitleHeader,
    Button,
    Stack,
    TableRadioGroup,
    TableRadioRow,
    TableRow,
    Text,
    TextLink,
} from 'shared:components'
import Constants from 'shared:constants'
import type { PluginStorage } from '..'
import { getAudioDeviceDisplayText, getAudioDeviceIcon, getAudioDevices, setAudioOutputDevice } from '../utils'

export default function AudioOutputDevicesSelectionSheet({
    onPress,
    vstorage,
    fromVoiceCall,
}: { onPress?: () => void; vstorage: PluginStorage; fromVoiceCall?: boolean }) {
    const devices = getAudioDevices()

    return (
        <ActionSheet>
            <ReactNative.View>
                <Stack spacing={16}>
                    <BottomSheetTitleHeader title="Select Preferred Audio Output Device" />
                    <Stack spacing={12}>
                        <TableRadioGroup
                            title="Audio Devices"
                            hasIcons
                            value={vstorage.rememberOutputDevice.device.deviceId}
                            onChange={dvid => {
                                const device = devices.find(dv => dv.deviceId === dvid)
                                vstorage.rememberOutputDevice.device = device
                                setAudioOutputDevice(device)
                                if (onPress) onPress()
                            }}
                        >
                            {devices.map(device => (
                                <TableRadioRow
                                    key={device.deviceId.toString()}
                                    icon={<TableRow.Icon source={getAudioDeviceIcon(device.simpleDeviceType)} />}
                                    label={getAudioDeviceDisplayText(device)}
                                    subLabel={device.deviceName}
                                    value={device.deviceId}
                                />
                            ))}
                        </TableRadioGroup>
                    </Stack>
                    {fromVoiceCall && (
                        <Stack spacing={0}>
                            <Text variant="text-xs/normal" color="TEXT_MUTED">
                                Missing a few devices from the stock panel? Make a{' '}
                                <TextLink url={Constants.Repository.FeatureRequestURL}>feature request</TextLink> for
                                them!
                            </Text>
                            <Text variant="text-xs/normal" color="TEXT_MUTED">
                                Alternatively, you can swipe up the dock and access the{' '}
                                <Text variant="text-xs/bold">Change Audio Output</Text> option.
                            </Text>
                        </Stack>
                    )}
                </Stack>
            </ReactNative.View>
        </ActionSheet>
    )
}
