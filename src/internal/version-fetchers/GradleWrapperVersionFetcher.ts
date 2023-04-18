import { GradleVersionDatasource } from 'renovate/dist/modules/datasource/gradle-version'
import { RenovateVersionFetcherDelegate } from '../RenovateVersionFetcherDelegate'
import { VersionFetcherSupport } from '../VersionFetcher'

export class GradleWrapperVersionFetcher extends RenovateVersionFetcherDelegate {

    constructor() {
        super(new GradleVersionDatasource())
    }

    get supportDependencies(): VersionFetcherSupport {
        return 'no'
    }

    get supportRepositories(): VersionFetcherSupport {
        return 'no'
    }

}
