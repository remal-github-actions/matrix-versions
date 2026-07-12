import { GradlePluginVersionFetcher } from './GradlePluginVersionFetcher.js'
import { GradleWrapperVersionFetcher } from './GradleWrapperVersionFetcher.js'
import { JavaVersionFetcher } from './JavaVersionFetcher.js'
import { MavenVersionFetcher } from './MavenVersionFetcher.js'
import { NodeVersionFetcher } from './NodeVersionFetcher.js'
import { VersionFetcher } from './VersionFetcher.js'

export const fullSupportedVersionFetcherSuffix = '/full'

export const supportedVersionFetchers: Map<string, VersionFetcher> = new Map()
supportedVersionFetchers.set('gradle-wrapper', new GradleWrapperVersionFetcher())
supportedVersionFetchers.set('gradle-plugin', new GradlePluginVersionFetcher())
supportedVersionFetchers.set('java', new JavaVersionFetcher())
//supportedVersionFetchers.set('java' + fullSupportedVersionFetcherSuffix, new JavaFullVersionFetcher())
supportedVersionFetchers.set('maven', new MavenVersionFetcher())
supportedVersionFetchers.set('node', new NodeVersionFetcher())

//supportedVersionFetchers.set('node' + fullSupportedVersionFetcherSuffix, new NodeFullVersionFetcher())

export function getVersionFetcher(id: string): VersionFetcher {
    const fetcher = supportedVersionFetchers.get(id)
    if (fetcher == null) {
        throw new Error(`Unsupported ${VersionFetcher.name} ID: ${id}`)
    }
    return fetcher
}
