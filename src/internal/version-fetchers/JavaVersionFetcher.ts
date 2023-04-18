import { JavaVersionDatasource } from 'renovate/dist/modules/datasource/java-version'
import { RenovateDatasourceFactory, VersionFetcherRenovateDatasource } from '../VersionFetcherRenovateDatasource'

const defaultDatasource = new JavaVersionDatasource()

const ltsDatasource = (function() {
    const datasource = new JavaVersionDatasource()
    const originalGetPageReleases = datasource['getPageReleases']
    datasource['getPageReleases'] = async function(url, page) {
        url = url.replace('?', '?lts=true&')
        return originalGetPageReleases.call(datasource, url, page)
    }
    return datasource
})()

const datasourceFactory: RenovateDatasourceFactory = (params) => {
    if (params.only?.includes('lts')) {
        return ltsDatasource
    } else {
        return defaultDatasource
    }
}

export class JavaVersionFetcher extends VersionFetcherRenovateDatasource {

    constructor() {
        super(datasourceFactory)
    }

    get defaultVersioning() {
        return 'maven'
    }

    get withDependencies() {
        return false
    }

}
