import { MavenDatasource } from 'renovate/dist/modules/datasource/maven'
import { RenovateVersionFetcherDelegate } from '../RenovateVersionFetcherDelegate'
import { VersionFetcherSupport } from '../VersionFetcher'

export class MavenVersionFetcher extends RenovateVersionFetcherDelegate {

    constructor() {
        super(new MavenDatasource())
    }

    get supportDependencies(): VersionFetcherSupport {
        return 'required'
    }

    get supportRepositories(): VersionFetcherSupport {
        return 'optional'
    }

}
