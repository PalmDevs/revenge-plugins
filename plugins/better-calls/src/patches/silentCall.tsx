import { IconButton } from 'shared:components'
import type { PluginStorage } from '..'

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

export const patch = (vstorage: PluginStorage, unpatches: UnpatchFunction[]) => {
    const { api, metro } = bunny

    const callModule: CallModule | undefined = metro.findByPropsLazy('call', 'ring', 'stopRinging')
    const PrivateChannelButtons = metro.findByTypeNameLazy('PrivateChannelButtons')

    // Silently fail if we can't find the modules
    if (!callModule || !PrivateChannelButtons) return

    /*
            The structure looks like:

            <PrivateChannelButtons>
                <Fragment>
                    <IconButton />
                    ...
        */
    unpatches.push(
        api.patcher.after('type', PrivateChannelButtons, ([{ channelId }], rt) => {
            const [silenced, setSilenced] = React.useState(vstorage.silentCall[channelId] ?? false)
            const fragmentProps = rt.props.children[0].props

            // This can occasionally be undefined because when you call someone, the call buttons are removed and replaced with the hang up button
            if (fragmentProps.children)
                fragmentProps.children = [
                    <IconButton
                        key="better-calls:silent-call-toggle"
                        icon={api.assets.findAssetId(silenced ? 'ic_notif_off' : 'ic_notif')}
                        onPress={() => {
                            vstorage[channelId] = !silenced
                            setSilenced(!silenced)
                        }}
                        variant={silenced ? 'primary' : 'tertiary'}
                        size="sm"
                    />,
                    ...fragmentProps.children,
                ]
        }),
    )

    unpatches.push(
        api.patcher.instead('ring', callModule, (args: Parameters<CallModule['ring']>, ring) => {
            if (!vstorage[args[0]]) return ring.apply(callModule, args)
        }),
    )

    return unpatches
}
