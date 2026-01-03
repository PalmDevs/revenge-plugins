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

const NextPreference = {
    undefined: true,
    true: false,
    false: undefined,
}

const Preferences = {
    undefined: {
        icon: 'BellIcon',
        description: 'Following the global setting for this user',
        buttonVariant: 'tertiary',
        action: (cid: string) => storage.unset(`silentCall.users.${cid}`),
    },
    true: {
        icon: 'BellZIcon',
        description: 'Calling will now silently call this user',
        buttonVariant: 'primary',
        action: (cid: string) => storage.set(`silentCall.users.${cid}`, true),
    },
    false: {
        icon: 'ic_notification_settings_24px',
        description: 'Calling will now ring this user',
        buttonVariant: 'secondary',
        action: (cid: string) => storage.set(`silentCall.users.${cid}`, false),
    },
} as const

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

            const key = String(silenced) as keyof typeof Preferences
            const preference = () => Preferences[key]
            const fragmentProps = rt?.props?.children?.[0]?.props

            // This can occasionally be undefined because when you call someone, the call buttons are removed and replaced with the hang up button
            // In bot DMs, it's an object.
            if (Array.isArray(fragmentProps?.children))
                fragmentProps.children = [
                    <IconButton
                        key="better-calls:silent-call-toggle"
                        icon={assets.findAssetId(preference().icon)}
                        onPress={() => {
                            setSilenced(NextPreference[key])
                            const {
                                description: content,
                                icon,
                                action,
                            } = Preferences[String(NextPreference[key]) as keyof typeof Preferences]
                            const rt = action(channelId)
                            if (rt) toasts.showToast(content, assets.findAssetId(icon))
                        }}
                        variant={preference().buttonVariant}
                        size="sm"
                    />,
                    ...fragmentProps.children,
                ]
        }),
    )

    unpatches.push(
        // @ts-expect-error: Don't care
        patcher.instead('ring', callModule, (args: Parameters<CallModule['ring']>, ring) => {
            const silentCall = storage.getFirstDefined(`silentCall.users.${args[0]}`, 'silentCall.default')
            if (!silentCall) return ring.apply(callModule, args)
        }),
    )

    return unpatches
}
