import { storage } from '@vendetta/plugin'

export const vstorage = storage as Record<string, boolean>

let unpatch: UnpatchFunction | undefined

export default {
    onLoad: () => {
        const { metro, api } = bunny

        const { clearRecentChannels } = metro.findByProps('clearRecentChannels')
        const datasource = metro.findByProps('SuggestedCategory')

        unpatch = api.patcher.instead('SuggestedCategory', datasource, ([props], orig) => {
            // If it still gets rendered without any suggestions, we can just render an empty section
            // Don't need to send an unnecessary request to clear the recent channels
            if (!props.channelIds.length) return null
            clearRecentChannels(props.guildId, props.channelIds)
            return orig.apply(datasource.SuggestedCategory, [{ ...props, channelIds: [] }])
        })
    },
    onUnload: unpatch,
}
