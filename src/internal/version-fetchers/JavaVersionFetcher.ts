import { JavaVersionDatasource } from 'renovate/dist/modules/datasource/java-version'
import { RenovateDatasourceFactory, RenovateVersionFetcherDelegate } from '../RenovateVersionFetcherDelegate'
import { VersionFetcherSupport, VersionFetchParams } from '../VersionFetcher'

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

function hasLtsSuffix(dependency?: string): boolean {
    return dependency != null && (dependency === 'lts' || dependency.endsWith('-lts'))
}

const datasourceFactory: RenovateDatasourceFactory = (params) => {
    if (hasLtsSuffix(params.dependency)) {
        return ltsDatasource
    } else {
        return defaultDatasource
    }
}

export class JavaVersionFetcher extends RenovateVersionFetcherDelegate {

    constructor() {
        super(datasourceFactory)
    }

    protected normalizeParams(params: VersionFetchParams) {
        params.dependency = removeLtsSuffix(params.dependency)
        if (params.dependency === 'jre') params.dependency = 'java-jre'
    }

    get supportDependencies(): VersionFetcherSupport {
        return 'optional'
    }

    get supportedOnlyDependencies(): string[] {
        return [
            'lts',
            'jre',
            'jre-lts',
        ]
    }

    get supportRepositories(): VersionFetcherSupport {
        return 'no'
    }

}

function removeLtsSuffix(dependency?: string): string | undefined {
    if (dependency == null) {
        return undefined
    } else if (dependency === 'lts') {
        return undefined
    } else if (dependency.endsWith('-lts')) {
        return dependency.substring(0, dependency.length - '-lts'.length)
    } else {
        return dependency
    }
}
