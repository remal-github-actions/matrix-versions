import { onlyUnique } from '../utils'
import { VersionFetchParams } from '../VersionFetcher'
import { JavaFullVersionFetcher } from './JavaFullVersionFetcher'

export class JavaVersionFetcher extends JavaFullVersionFetcher {

    get defaultVersioning() {
        return 'maven'
    }

    async fetchVersions(params: VersionFetchParams): Promise<string[]> {
        return super.fetchVersions(params)
            .then(versions => versions
                .map(version => version.replace(/^(?<major>\d+).*$/, '$<major>'))
                .filter(onlyUnique),
            )
    }

}

