import { onlyUnique } from '../utils.js'
import { VersionFetchParams } from '../VersionFetcher.js'
import { JavaFullVersionFetcher } from './JavaFullVersionFetcher.js'

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

