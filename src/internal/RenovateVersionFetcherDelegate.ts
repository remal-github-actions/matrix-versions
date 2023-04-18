import is from '@sindresorhus/is'
import { Datasource } from 'renovate/dist/modules/datasource/datasource'
import { Release, ReleaseResult } from 'renovate/dist/modules/datasource/types'
import { Versioning } from './config'
import { isEmpty, isNotEmpty } from './utils'
import { VersionFetcher, VersionFetchParams } from './VersionFetcher'

export type RenovateDatasourceFactory = ((params: VersionFetchParams) => Datasource)
export type RenovateReleaseFilter = (release: Release) => boolean

export abstract class RenovateVersionFetcherDelegate extends VersionFetcher {

    protected constructor(
        private readonly renovateDatasourceApi: Datasource | RenovateDatasourceFactory
    ) {
        super()
    }

    private getRenovateDatasource(params: VersionFetchParams = {}): Datasource {
        const renovateDatasourceApi = this.renovateDatasourceApi
        if (is.function_(renovateDatasourceApi)) {
            return renovateDatasourceApi(params)
        } else {
            return renovateDatasourceApi
        }
    }

    protected createRenovateReleaseFilter(params: VersionFetchParams): RenovateReleaseFilter {
        return release => release.isDeprecated !== true
    }

    protected normalizeParams(params: VersionFetchParams) {
        // do nothing
    }

    async fetchVersions(params: VersionFetchParams): Promise<string[]> {
        params = { ...params }
        if (this.supportDependencies === 'no') params.dependency = undefined
        if (this.supportRepositories === 'no') params.repository = undefined

        const supportedOnlyDependencies = this.supportedOnlyDependencies
        if (supportedOnlyDependencies.length
            && isNotEmpty(params.dependency)
            && !supportedOnlyDependencies.includes(params.dependency)
        ) {
            throw new Error(`Unsupported dependency: ${params.dependency}`)
        }

        const renovateDatasource = this.getRenovateDatasource(params)

        const renovateReleaseFilter = this.createRenovateReleaseFilter(params)
        this.normalizeParams(params)

        const dependency = params.dependency
        if (this.supportDependencies === 'required' && isEmpty(dependency)) throw new Error('Empty dependency')

        const repository = params.repository
        let repositories: (string | undefined)[]
        if (repository != null) {
            repositories = [repository]
        } else {
            const defaultRepositories = renovateDatasource.defaultRegistryUrls
            if (defaultRepositories == null) {
                repositories = [undefined]
            } else if (is.function_(defaultRepositories)) {
                repositories = defaultRepositories()
            } else {
                repositories = defaultRepositories
            }
        }

        const notEmptyRepositories = repositories.filter(isNotEmpty)
        if (this.supportRepositories === 'required' && isEmpty(notEmptyRepositories)) {
            throw new Error('No repositories passed')
        }

        const results: ReleaseResult[] = []
        for (const currentRepository of repositories) {
            const result = await renovateDatasource.getReleases({
                packageName: dependency != null ? dependency : '',
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
        if (notEmptyRepositories.length) {
            message += ` in ${notEmptyRepositories.join(', ')}`
        }
        throw new Error(message)
    }

    get defaultVersioning(): Versioning {
        const renovateDatasource = this.getRenovateDatasource()
        return renovateDatasource.defaultVersioning || super.defaultVersioning
    }

}
