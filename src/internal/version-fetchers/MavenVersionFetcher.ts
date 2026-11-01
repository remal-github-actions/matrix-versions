import { MavenDatasource } from 'renovate/dist/modules/datasource/maven/index.js'
import { RenovateDatasourceSimple, RenovateDatasourceSimpleWrapper } from '../RenovateDatasource.js'
import { VersionFetcherRenovateDatasource } from './VersionFetcherRenovateDatasource.js'

// Google's Maven Central mirror, queried before Maven Central itself.
const GOOGLE_MAVEN_CENTRAL_MIRROR = 'https://maven-central.storage-download.googleapis.com/maven2/'

function createDatasource(): RenovateDatasourceSimple {
    const datasource = new MavenDatasource()

    class WrappedDatasource extends RenovateDatasourceSimpleWrapper {
        getDefaultRegistryUrls(packageName: string): string[] | undefined {
            return [GOOGLE_MAVEN_CENTRAL_MIRROR, ...super.getDefaultRegistryUrls(packageName) ?? []]
        }
    }

    return new WrappedDatasource(datasource)
}

export class MavenVersionFetcher extends VersionFetcherRenovateDatasource {

    constructor() {
        super(createDatasource())
    }

    get withDependencies() {
        return true
    }

}
