import { NodeVersionDatasource } from 'renovate/dist/modules/datasource/node-version'
import { VersionFetchParams } from '../VersionFetcher'
import { RenovateReleaseFilter, VersionFetcherRenovateDatasource } from '../VersionFetcherRenovateDatasource'

export class NodeVersionFetcher extends VersionFetcherRenovateDatasource {

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

    get withDependencies() {
        return false
    }

}
