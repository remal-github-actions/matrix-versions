import { GradleVersionDatasource } from 'renovate/dist/modules/datasource/gradle-version'
import { VersionFetcherRenovateDatasource } from '../VersionFetcherRenovateDatasource'

export class GradleWrapperVersionFetcher extends VersionFetcherRenovateDatasource {

    constructor() {
        super(new GradleVersionDatasource())
    }

    get withDependencies() {
        return false
    }

}
