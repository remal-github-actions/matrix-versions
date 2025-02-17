import { Versioning, VersionOnlyFilter } from './config.js'

export abstract class VersionFetcher {

    abstract fetchVersions(params: VersionFetchParams): Promise<string[]>

    abstract get withDependencies(): boolean

    get versioning(): Versioning {
        return 'loose'
    }

}

export interface VersionFetchParams {
    dependency?: string
    repositories?: string[]
    only?: VersionOnlyFilter[]
}
