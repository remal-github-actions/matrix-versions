import { GradleWrapperVersionFetcher } from './version-fetchers/GradleWrapperVersionFetcher'
import { JavaFullVersionFetcher } from './version-fetchers/JavaFullVersionFetcher'
import { JavaVersionFetcher } from './version-fetchers/JavaVersionFetcher'
import { MavenVersionFetcher } from './version-fetchers/MavenVersionFetcher'
import { NodeFullVersionFetcher } from './version-fetchers/NodeFullVersionFetcher'
import { NodeVersionFetcher } from './version-fetchers/NodeVersionFetcher'
import { VersionFetcher } from './VersionFetcher'

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
