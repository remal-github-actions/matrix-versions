import { GradlePluginVersionFetcher } from './GradlePluginVersionFetcher'
import { GradleWrapperVersionFetcher } from './GradleWrapperVersionFetcher'
import { JavaVersionFetcher } from './JavaVersionFetcher'
import { MavenVersionFetcher } from './MavenVersionFetcher'
import { NodeVersionFetcher } from './NodeVersionFetcher'
import { VersionFetcher } from './VersionFetcher'

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
