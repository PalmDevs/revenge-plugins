import { IconButton } from 'shared:components'
import { assets, patcher } from '@revenge-mod/api'
import { findByPropsLazy, findByTypeNameLazy } from '@revenge-mod/metro'
import { toasts } from '@revenge-mod/ui'
import { type PluginStorage, storage } from '..'

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

const NextPreferenceActionMap = {
    undefined: cid => storage.set(`silentCall.users.${cid}`, true),
    true: cid => storage.set(`silentCall.users.${cid}`, false),
    false: cid => storage.unset(`silentCall.users.${cid}`),
}

const PreferenceStyleMap = {
    undefined: {
        content: 'Following the global setting for this user',
        icon: 'ic_notif',
        variant: 'secondary',
    },
    true: {
        content: 'Calling will now silently call this user',
        icon: 'ic_notif_off',
        variant: 'primary',
    },
    false: {
        content: 'Calling will now ring this user',
        icon: 'ic_notification_settings_24px',
        variant: 'secondary',
    },
}

export const patch = (storage: PluginStorage, unpatches: UnpatchFunction[]) => {
    const callModule: CallModule | undefined = findByPropsLazy('call', 'ring', 'stopRinging')
    const PrivateChannelButtons = findByTypeNameLazy('PrivateChannelButtons')

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
        patcher.after('type', PrivateChannelButtons, ([{ channelId }], rt) => {
            const [silenced, setSilenced] = React.useState<boolean | undefined>(
                storage.get(`silentCall.users.${channelId}`),
            )
            const fragmentProps = rt.props.children[0].props

            // This can occasionally be undefined because when you call someone, the call buttons are removed and replaced with the hang up button
            if (fragmentProps.children)
                fragmentProps.children = [
                    <IconButton
                        key="better-calls:silent-call-toggle"
                        icon={assets.findAssetId(PreferenceStyleMap[String(silenced)].icon)}
                        onPress={() => {
                            const newPref = NextPreferenceActionMap[String(silenced)](channelId)
                            setSilenced(newPref)

                            const toastData = PreferenceStyleMap[String(newPref)]
                            toasts.showToast(toastData.content, assets.findAssetId(toastData.icon))
                        }}
                        variant={PreferenceStyleMap[String(silenced)].variant}
                        size="sm"
                    />,
                    ...fragmentProps.children,
                ]
        }),
    )

    unpatches.push(
        patcher.instead('ring', callModule, (args: Parameters<CallModule['ring']>, ring) => {
            const silentCall = storage.getFirstDefined(`silentCall.users.${args[0]}`, 'silentCall.default')
            if (!silentCall) return ring.apply(callModule, args)
        }),
    )

    return unpatches
}
