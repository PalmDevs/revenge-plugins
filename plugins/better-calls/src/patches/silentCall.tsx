import { IconButton } from 'shared:components'
import { type PluginStorage, vstorage } from '..'

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

const NextPrefMap = {
    undefined: cid => {
        vstorage.silentCall.users[cid] = true
        return true
    },
    true: cid => {
        vstorage.silentCall.users[cid] = false
        return false
    },
    false: cid => {
        delete vstorage.silentCall.users[cid]
        return undefined
    },
}

const NewPrefToastMap = {
    undefined: {
        content: 'Following the global setting for this user',
        icon: 'ic_call_ended',
    },
    true: {
        content: 'Calling will now silently call this user',
        icon: 'ic_notif_off',
    },
    false: {
        content: 'Calling will now ring this user',
        icon: 'ic_notif',
    },
}

export const patch = (vstorage: PluginStorage, unpatches: UnpatchFunction[]) => {
    const { api, metro, ui } = bunny

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
            const [silenced, setSilenced] = React.useState<boolean | undefined>(vstorage.silentCall.users[channelId])
            const fragmentProps = rt.props.children[0].props

            // This can occasionally be undefined because when you call someone, the call buttons are removed and replaced with the hang up button
            if (fragmentProps.children)
                fragmentProps.children = [
                    <IconButton
                        key="better-calls:silent-call-toggle"
                        icon={api.assets.findAssetId(
                            silenced === undefined ? 'ic_call_ended' : silenced ? 'ic_notif_off' : 'ic_notif',
                        )}
                        onPress={() => {
                            const newPref = NextPrefMap[String(silenced)](channelId)
                            setSilenced(newPref)

                            const toastData = NewPrefToastMap[String(newPref)]
                            ui.toasts.showToast(toastData.content, api.assets.findAssetId(toastData.icon))
                        }}
                        variant={silenced === undefined ? 'tertiary' : silenced ? 'primary' : 'secondary'}
                        size="sm"
                    />,
                    ...fragmentProps.children,
                ]
        }),
    )

    unpatches.push(
        api.patcher.instead('ring', callModule, (args: Parameters<CallModule['ring']>, ring) => {
            const silentCall = vstorage.silentCall.users[args[0]] ?? vstorage.silentCall.default
            if (!silentCall) return ring.apply(callModule, args)
        }),
    )

    return unpatches
}
