import { JavaVersionDatasource } from 'renovate/dist/modules/datasource/java-version'
import { GetReleasesConfig, Release, ReleaseResult } from 'renovate/dist/modules/datasource/types.js'
import {
    RenovateDatasourceSimple,
    RenovateDatasourceSimpleComposite,
    RenovateDatasourceSimpleWrapper,
} from '../RenovateDatasource'
import { RenovateReleaseFilter } from '../RenovateReleaseFilter'
import { VersionFetchParams } from '../VersionFetcher'
import { VersionFetcherRenovateDatasource } from '../VersionFetcherRenovateDatasource.js'

interface ReleaseWithLts extends Release {
    isLts?: boolean
}

function createDatasource(lts: boolean): RenovateDatasourceSimple {
    const datasource = new JavaVersionDatasource()
    const originalGetPageReleases = datasource['getPageReleases']
    datasource['getPageReleases'] = async function(url, page) {
        url = url.replace('?', `?lts=${lts ? 'true' : 'false'}&`)
        return originalGetPageReleases.call(datasource, url, page)
    }

    class WrappedDatasource extends RenovateDatasourceSimpleWrapper {
        constructor(delegate: RenovateDatasourceSimple) {
            super(delegate)
        }

        async getReleases(config: GetReleasesConfig): Promise<ReleaseResult | null> {
            return super.getReleases(config).then(result => {
                result?.releases?.forEach(release => {
                    (release as ReleaseWithLts).isLts = lts
                })
                return result
            })
        }

    }

    return new WrappedDatasource(datasource)
}

export class JavaFullVersionFetcher extends VersionFetcherRenovateDatasource {

    constructor() {
        super(new RenovateDatasourceSimpleComposite(
            createDatasource(true),
            createDatasource(false),
        ))
    }

    protected createRenovateReleaseFilter(params: VersionFetchParams): RenovateReleaseFilter {
        const defaultFilter = super.createRenovateReleaseFilter(params)
        const only = params.only
        if (!only?.length) {
            return defaultFilter
        }

        const hasLtsFilter = only.includes('lts')
        const hasOtherNotLtsFilters = only.some(it => !it.match(/\blts\b/))

        let isLtsMet = false
        return release => {
            if (!defaultFilter(release)) {
                return false
            }

            if ((release as ReleaseWithLts).isLts) {
                isLtsMet = true
            }

            if (hasLtsFilter) {
                if (!isLtsMet && hasOtherNotLtsFilters) {
                    return true
                }

                if (!(release as ReleaseWithLts).isLts) {
                    return false
                }
            }

            return true
        }
    }

    get versioning() {
        return 'maven'
    }

    get withDependencies() {
        return false
    }

}

