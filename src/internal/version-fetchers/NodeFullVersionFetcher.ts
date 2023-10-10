import { NodeVersionDatasource } from 'renovate/dist/modules/datasource/node-version'
import { onlyUnique } from '../utils'
import { VersionFetchParams } from '../VersionFetcher'
import { RenovateReleaseFilter, VersionFetcherRenovateDatasource } from '../VersionFetcherRenovateDatasource'

export class NodeFullVersionFetcher extends VersionFetcherRenovateDatasource {

    constructor() {
        super(new NodeVersionDatasource())
    }

    protected createRenovateReleaseFilter(params: VersionFetchParams): RenovateReleaseFilter {
        const defaultFilter = super.createRenovateReleaseFilter(params)
        if (params.only?.includes('lts')) {
            return release => defaultFilter(release) && !!release.isStable

        }
        return defaultFilter
    }

    get defaultVersioning() {
        return 'semver-coerced'
    }

    async fetchVersions(params: VersionFetchParams): Promise<string[]> {
        return super.fetchVersions(params)
            .then(versions => versions
                .map(version => version.replace(/^v/, ''))
                .filter(onlyUnique),
            )
    }

    get withDependencies() {
        return false
    }

}
