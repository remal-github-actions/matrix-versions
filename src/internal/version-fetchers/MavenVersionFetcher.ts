import { MavenDatasource } from 'renovate/dist/modules/datasource/maven'
import { VersionFetcherRenovateDatasource } from '../VersionFetcherRenovateDatasource.js'

export class MavenVersionFetcher extends VersionFetcherRenovateDatasource {

    constructor() {
        super(new MavenDatasource())
    }

    get withDependencies() {
        return true
    }

}
