import { MavenDatasource } from 'renovate/dist/modules/datasource/maven'
import { GetReleasesConfig, ReleaseResult } from 'renovate/dist/modules/datasource/types.js'
import { RenovateDatasourceSimple, RenovateDatasourceSimpleWrapper } from '../RenovateDatasource'
import { VersionFetcherRenovateDatasource } from '../VersionFetcherRenovateDatasource.js'

function createDatasource(): RenovateDatasourceSimple {
    const datasource = new MavenDatasource()

    class WrappedDatasource extends RenovateDatasourceSimpleWrapper {
        constructor(delegate: RenovateDatasourceSimple) {
            super(delegate)
        }

        async getReleases(config: GetReleasesConfig): Promise<ReleaseResult | null> {
            config.packageName = `${config.packageName}:${config.packageName}.gradle.plugin`
            return super.getReleases(config)
        }

        get defaultRegistryUrls(): string[] | (() => string[]) | undefined {
            return ['https://plugins.gradle.org/m2']
        }
    }

    return new WrappedDatasource(datasource)
}

export class GradlePluginVersionFetcher extends VersionFetcherRenovateDatasource {

    constructor() {
        super(createDatasource())
    }

    get withDependencies() {
        return true
    }

}
