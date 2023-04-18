import { Versioning } from './config'

export type VersionFetcherSupport = 'required' | 'optional' | 'no'

export abstract class VersionFetcher {

    abstract fetchVersions(params: VersionFetchParams): Promise<string[]>

    abstract get supportDependencies(): VersionFetcherSupport

    get supportedOnlyDependencies(): string[] {
        return []
    }

    abstract get supportRepositories(): VersionFetcherSupport

    get defaultVersioning(): Versioning {
        return 'loose'
    }

}

export interface VersionFetchParams {
    dependency?: string
    repository?: string
}
