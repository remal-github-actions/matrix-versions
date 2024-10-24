import { Datasource } from 'renovate/dist/modules/datasource/datasource.js'
import { Release, ReleaseResult } from 'renovate/dist/modules/datasource/types.js'
import { Versioning } from './config.js'
import { isFunction, isNotEmpty } from './utils.js'
import { VersionFetcher, VersionFetchParams } from './VersionFetcher.js'

export type RenovateDatasourceFactory = ((params: VersionFetchParams) => Datasource)
export type RenovateReleaseFilter = (release: Release) => boolean

export abstract class VersionFetcherRenovateDatasource extends VersionFetcher {

    protected constructor(
        private readonly renovateDatasourceApi: Datasource | RenovateDatasourceFactory,
    ) {
        super()
    }

    private getRenovateDatasource(params: VersionFetchParams = {}): Datasource {
        const renovateDatasourceApi = this.renovateDatasourceApi
        if (isFunction(renovateDatasourceApi)) {
            return renovateDatasourceApi(params)
        } else {
            return renovateDatasourceApi
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected createRenovateReleaseFilter(params: VersionFetchParams): RenovateReleaseFilter {
        return release => release.isDeprecated !== true
    }

    async fetchVersions(params: VersionFetchParams): Promise<string[]> {
        params = { ...params }

        if (!this.withDependencies) {
            params.dependency = undefined
        } else if (!isNotEmpty(params.dependency)) {
            throw new Error('Empty dependency')
        }
        const dependency = params.dependency

        const renovateDatasource = this.getRenovateDatasource(params)
        const renovateReleaseFilter = this.createRenovateReleaseFilter(params)

        let repositories = params.repositories ?? []
        if (!repositories.length) {
            const defaultRepositories = renovateDatasource.defaultRegistryUrls
            if (defaultRepositories == null) {
                repositories = []
            } else if (isFunction(defaultRepositories)) {
                repositories = defaultRepositories()
            } else {
                repositories = defaultRepositories
            }
        }
        if (!isNotEmpty(repositories)) {
            throw new Error('No repositories passed')
        }

        const results: ReleaseResult[] = []
        for (const currentRepository of repositories) {
            const result = await renovateDatasource.getReleases({
                packageName: dependency ?? '',
                registryUrl: currentRepository,
            })
            if (result != null) {
                results.push(result)
            }
        }

        const versions = results.flatMap(result => result.releases)
            .filter(renovateReleaseFilter)
            .map(release => release.version)
            .filter(isNotEmpty)

        if (versions.length) {
            return versions
        }

        let message = 'No versions found'
        if (isNotEmpty(dependency)) {
            message += ` of '${dependency}'`
        }
        message += ` in ${repositories.join(', ')}`
        throw new Error(message)
    }

    get defaultVersioning(): Versioning {
        const renovateDatasource = this.getRenovateDatasource()
        return renovateDatasource.defaultVersioning ?? super.defaultVersioning
    }

}
