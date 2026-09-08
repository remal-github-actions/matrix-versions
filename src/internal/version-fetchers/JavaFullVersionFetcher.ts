import { adoptiumRegistryUrl } from 'renovate/dist/modules/datasource/java-version/adoptium.js'
import { parsePackage } from 'renovate/dist/modules/datasource/java-version/common.js'
import { JavaVersionDatasource } from 'renovate/dist/modules/datasource/java-version/index.js'
import { AdoptiumJavaResponse } from 'renovate/dist/modules/datasource/java-version/schema.js'
import type { GetReleasesConfig, Release, ReleaseResult } from 'renovate/dist/modules/datasource/types.js'
import { RequestError } from 'renovate/dist/util/http/got.js'
import {
    RenovateDatasourceSimple,
    RenovateDatasourceSimpleComposite,
    RenovateDatasourceSimpleWrapper,
} from '../RenovateDatasource.js'
import { RenovateReleaseFilter } from '../RenovateReleaseFilter.js'
import { VersionFetchParams } from './VersionFetcher.js'
import { VersionFetcherRenovateDatasource } from './VersionFetcherRenovateDatasource.js'

interface ReleaseWithLts extends Release {
    isLts?: boolean
}

const adoptiumPageSize = 50

// renovate ships no type declarations for its java-version datasource,
// so the base class members used here are typed via this cast
type JavaVersionDatasourceBase = new () => RenovateDatasourceSimple & {
    http: {
        getJson(url: string, schema?: unknown): Promise<{ body: any }>
    }
    handleGenericErrors(err: unknown): never
}

// Mirrors renovate's adoptium fetching (modules/datasource/java-version/adoptium.js, renovate 44.53.0)
// with the `lts` query parameter added, which renovate does not expose
class LtsFilteringJavaVersionDatasource extends (JavaVersionDatasource as JavaVersionDatasourceBase) {

    constructor(private readonly lts: boolean) {
        super()

        // Fail loudly when renovate changes its adoptium internals
        // instead of silently diverging from them
        const renovateGetReleases = JavaVersionDatasource.prototype._getReleases.toString()
        if (!renovateGetReleases.includes('getAdoptiumReleases')) {
            throw new Error(
                'renovate JavaVersionDatasource no longer fetches via getAdoptiumReleases,'
                + ' review LtsFilteringJavaVersionDatasource',
            )
        }
    }

    async _getReleases({ packageName }: GetReleasesConfig): Promise<ReleaseResult | null> {
        const pkgConfig = parsePackage(packageName)
        let url = `${adoptiumRegistryUrl}v3/info/release_versions`
            + `?page_size=${adoptiumPageSize}`
            + `&image_type=${pkgConfig.imageType}&project=jdk&release_type=ga`
            + `&sort_method=DATE&sort_order=DESC`
            + `&lts=${this.lts}`
        if (pkgConfig.architecture) url += `&architecture=${pkgConfig.architecture}`
        if (pkgConfig.os) url += `&os=${pkgConfig.os}`

        const result: ReleaseResult = {
            homepage: 'https://adoptium.net',
            releases: [],
        }

        try {
            let page = 0
            let releases = await this.getPageReleases(url, page)
            while (releases) {
                result.releases.push(...releases)
                if (releases.length !== adoptiumPageSize || page >= adoptiumPageSize) {
                    break
                }
                page += 1
                releases = await this.getPageReleases(url, page)
            }
        } catch (err) {
            this.handleGenericErrors(err)
            return null
        }

        return result.releases.length ? result : null
    }

    private async getPageReleases(url: string, page: number): Promise<Release[] | null> {
        try {
            const body = (await this.http.getJson(`${url}&page=${page}`, AdoptiumJavaResponse))?.body
            return body?.versions?.map(({ semver }: any) => ({ version: semver })) ?? null
        } catch (err) {
            // Adoptium returns 404 for pages beyond the last one
            if (page !== 0 && err instanceof RequestError && (err as any).response?.statusCode === 404) {
                return null
            }
            throw err
        }
    }

}

function createDatasource(lts: boolean): RenovateDatasourceSimple {
    const datasource = new LtsFilteringJavaVersionDatasource(lts)

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

