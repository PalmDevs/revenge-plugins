import { storage } from '@vendetta/plugin'

export const vstorage = storage as Record<string, boolean>

type CallModule = {
    //? The values were "channelId", false, true, null, null in my testing
    call(
        channelId: string,
        _unknownBoolOne: boolean,
        _unknownBoolTwo: boolean,
        _unknownOne: unknown | null,
        _unknownTwo: unknown | null,
    ): void
    // TODO: Maybe in a group chat, we can make it so you can choose people to ring?
    ring(channelId: string, recipients: string[] | null): void
    stopRinging(channelId: string, recipients: string[] | null): void
}

let unpatchCallRing: UnpatchFunction | undefined
let unpatchSilentCallToggleButton: UnpatchFunction | undefined

export default {
    onLoad: () => {
        const { metro, api } = bunny

        const callModule: CallModule | undefined = metro.findByPropsLazy('call', 'ring', 'stopRinging')
        const PrivateChannelButtons = metro.findByTypeNameLazy('PrivateChannelButtons')
        const { IconButton } = metro.findByPropsLazy('IconButton')

        if (!callModule || !PrivateChannelButtons || !IconButton)
            return alert(
                `Better Calls failed to start, modules list:\ncallModule: ${callModule}\nPrivateChannelButtons: ${PrivateChannelButtons}\nIconButton: ${IconButton}`,
            )

        /*
            The structure looks like:

            <PrivateChannelButtons>
                <Fragment>
                    <IconButton />
                    ...
        */
        unpatchSilentCallToggleButton = api.patcher.after('type', PrivateChannelButtons, ([{ channelId }], rt) => {
            const [silenced, setSilenced] = React.useState(vstorage[channelId] ?? false)
            const fragmentProps = rt.props.children[0].props

            // This can occasionally be undefined because when you call someone, the call buttons are removed and replaced with the hang up button
            if (fragmentProps.children)
                fragmentProps.children = [
                    <IconButton
                        key="silent-call-toggle"
                        icon={api.assets.findAssetId(silenced ? 'ic_notif_off' : 'ic_notif')}
                        onPress={() => {
                            vstorage[channelId] = !silenced
                            setSilenced(!silenced)
                        }}
                        variant={silenced ? 'primary' : 'secondary'}
                        size="sm"
                    />,
                    ...fragmentProps.children,
                ]
        })

        unpatchCallRing = api.patcher.instead('ring', callModule, (args: Parameters<CallModule['ring']>, ring) => {
            if (!vstorage[args[0]]) return ring.apply(callModule, args)
        })
    },
    onUnload: () => {
        unpatchCallRing()
        unpatchSilentCallToggleButton()
    },
    settings: () => {
        return <ReactNative.Text>Other features than silent calls are coming soon.</ReactNative.Text>
    },
}
