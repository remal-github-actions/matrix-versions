import { GradleWrapperVersionFetcher } from './version-fetchers/GradleWrapperVersionFetcher'
import { JavaVersionFetcher } from './version-fetchers/JavaVersionFetcher'
import { MavenVersionFetcher } from './version-fetchers/MavenVersionFetcher'
import { NodeVersionFetcher } from './version-fetchers/NodeVersionFetcher'
import { VersionFetcher } from './VersionFetcher'

export const supportedVersionFetchers: Map<string, VersionFetcher> = new Map()
supportedVersionFetchers.set('gradle-wrapper', new GradleWrapperVersionFetcher())
supportedVersionFetchers.set('java', new JavaVersionFetcher())
supportedVersionFetchers.set('maven', new MavenVersionFetcher())
supportedVersionFetchers.set('node', new NodeVersionFetcher())

export function getVersionFetcher(id: string): VersionFetcher {
    const fetcher = supportedVersionFetchers.get(id)
    if (fetcher == null) {
        throw new Error(`Unsupported ${VersionFetcher.name} ID: ${id}`)
    }
    return fetcher
}
