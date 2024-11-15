import { ReleaseResult } from 'renovate/dist/modules/datasource/types.js'
import * as versionings from 'renovate/dist/modules/versioning'
import { Versioning } from './config.js'
import { RenovateDatasourceSimple } from './RenovateDatasource.js'
import { RenovateReleaseFilter } from './RenovateReleaseFilter'
import { isFunction, isNotEmpty, onlyUniqueBy } from './utils.js'
import { VersionFetcher, VersionFetchParams } from './VersionFetcher.js'

export abstract class VersionFetcherRenovateDatasource extends VersionFetcher {

    protected constructor(
        private readonly renovateDatasource: RenovateDatasourceSimple,
    ) {
        super()
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

        let repositories = params.repositories ?? []
        if (!repositories.length) {
            const defaultRepositories = this.renovateDatasource.defaultRegistryUrls
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
            const result = await this.renovateDatasource.getReleases({
                packageName: dependency ?? '',
                registryUrl: currentRepository,
            })
            if (result != null) {
                results.push(result)
            }
        }

        const versioning = versionings.get(this.versioning)
        const renovateReleaseFilter = this.createRenovateReleaseFilter(params)
        const versions = results
            .flatMap(result => result.releases)
            .filter(onlyUniqueBy(release => release.version))
            .toSorted((r1, r2) => {
                if (versioning.isGreaterThan(r1.version, r2.version)) {
                    return -1
                } else {
                    return 1
                }
            })
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

    get versioning(): Versioning {
        return this.renovateDatasource.defaultVersioning ?? super.versioning
    }

}
