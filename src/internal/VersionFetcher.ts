import { Versioning, VersionOnlyFilter } from './config'

export abstract class VersionFetcher {

    abstract fetchVersions(params: VersionFetchParams): Promise<string[]>

    abstract get withDependencies(): boolean

    get defaultVersioning(): Versioning {
        return 'loose'
    }

}

export interface VersionFetchParams {
    dependency?: string
    repositories?: string[]
    only?: VersionOnlyFilter[]
}
