import { patcher } from '@revenge-mod/api'
import { findByPropsLazy } from '@revenge-mod/metro'

let unpatch: UnpatchFunction | undefined

export default {
    onLoad: () => {
        const { clearRecentChannels } = findByPropsLazy('clearRecentChannels')
        const datasource = findByPropsLazy('SuggestedCategory')

        unpatch = patcher.instead('SuggestedCategory', datasource, ([props], orig) => {
            // If it still gets rendered without any suggestions, we can just render an empty section
            // Don't need to send an unnecessary request to clear the recent channels
            if (!props.channelIds.length) return null
            clearRecentChannels(props.guildId, props.channelIds)
            return orig.apply(datasource.SuggestedCategory, [{ ...props, channelIds: [] }])
        })
    },
    onUnload: unpatch,
}
