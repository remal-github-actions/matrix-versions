import { GradleWrapperVersionFetcher } from './version-fetchers/GradleWrapperVersionFetcher.js'
import { JavaFullVersionFetcher } from './version-fetchers/JavaFullVersionFetcher.js'
import { JavaVersionFetcher } from './version-fetchers/JavaVersionFetcher.js'
import { MavenVersionFetcher } from './version-fetchers/MavenVersionFetcher.js'
import { NodeFullVersionFetcher } from './version-fetchers/NodeFullVersionFetcher.js'
import { NodeVersionFetcher } from './version-fetchers/NodeVersionFetcher.js'
import { VersionFetcher } from './VersionFetcher.js'

export const fullSupportedVersionFetcherSuffix = '/full'

export const supportedVersionFetchers: Map<string, VersionFetcher> = new Map()
supportedVersionFetchers.set('gradle-wrapper', new GradleWrapperVersionFetcher())
supportedVersionFetchers.set('java', new JavaVersionFetcher())
supportedVersionFetchers.set('java' + fullSupportedVersionFetcherSuffix, new JavaFullVersionFetcher())
supportedVersionFetchers.set('maven', new MavenVersionFetcher())
supportedVersionFetchers.set('node', new NodeVersionFetcher())
supportedVersionFetchers.set('node' + fullSupportedVersionFetcherSuffix, new NodeFullVersionFetcher())

export function getVersionFetcher(id: string): VersionFetcher {
    const fetcher = supportedVersionFetchers.get(id)
    if (fetcher == null) {
        throw new Error(`Unsupported ${VersionFetcher.name} ID: ${id}`)
    }
    return fetcher
}
