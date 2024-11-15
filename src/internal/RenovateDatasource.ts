import { GetReleasesConfig, ReleaseResult } from 'renovate/dist/modules/datasource/types.js'

export interface RenovateDatasourceSimple {

    getReleases(config: GetReleasesConfig): Promise<ReleaseResult | null>

    defaultRegistryUrls?: string[] | (() => string[])

    defaultVersioning?: string

}

export class RenovateDatasourceSimpleWrapper implements RenovateDatasourceSimple {

    constructor(
        private readonly delegate: RenovateDatasourceSimple,
    ) {
    }

    async getReleases(config: GetReleasesConfig): Promise<ReleaseResult | null> {
        return this.delegate.getReleases(config)
    }

    get defaultRegistryUrls(): string[] | (() => string[]) | undefined {
        return this.delegate.defaultRegistryUrls
    }

    get defaultVersioning(): string | undefined {
        return this.delegate.defaultVersioning
    }

}

export class RenovateDatasourceSimpleComposite implements RenovateDatasourceSimple {

    private readonly primaryDatasource: RenovateDatasourceSimple
    private readonly secondaryDatasources: RenovateDatasourceSimple[]

    public constructor(
        primaryDatasource: RenovateDatasourceSimple,
        ...secondaryDatasources: RenovateDatasourceSimple[]
    ) {
        this.primaryDatasource = primaryDatasource
        this.secondaryDatasources = [...secondaryDatasources]
    }

    async getReleases(config: GetReleasesConfig): Promise<ReleaseResult | null> {
        return Promise.all([
            this.primaryDatasource.getReleases(config),
            ...this.secondaryDatasources.map(ds => ds.getReleases(config)),
        ]).then(results =>
            results.filter(it => it != null).reduce(
                (prev: (ReleaseResult | null), current: ReleaseResult) => {
                    if (prev == null) {
                        return current
                    }

                    current.releases.forEach(release => {
                        const exists = prev.releases.find(r => r.version === release.version)
                        if (!exists) {
                            prev.releases.push(release)
                        }
                    })
                    return prev
                },
                null,
            ),
        )
    }

    get defaultRegistryUrls(): string[] | (() => string[]) | undefined {
        return this.primaryDatasource.defaultRegistryUrls
    }

    get defaultVersioning(): string | undefined {
        return this.primaryDatasource.defaultVersioning
    }

}
