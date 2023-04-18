import { NodeVersionDatasource } from 'renovate/dist/modules/datasource/node-version'
import { RenovateReleaseFilter, RenovateVersionFetcherDelegate } from '../RenovateVersionFetcherDelegate'
import { VersionFetcherSupport, VersionFetchParams } from '../VersionFetcher'

export class NodeVersionFetcher extends RenovateVersionFetcherDelegate {

    constructor() {
        super(new NodeVersionDatasource())
    }

    protected createRenovateReleaseFilter(params: VersionFetchParams): RenovateReleaseFilter {
        const defaultFilter = super.createRenovateReleaseFilter(params)
        if (params.dependency === 'lts') {
            return release => defaultFilter(release) && !!release.isStable

        }
        return defaultFilter
    }

    protected normalizeParams(params: VersionFetchParams) {
        params.dependency = undefined
    }

    get supportDependencies(): VersionFetcherSupport {
        return 'optional'
    }

    get supportedOnlyDependencies(): string[] {
        return [
            'lts',
        ]
    }

    get supportRepositories(): VersionFetcherSupport {
        return 'no'
    }

}
