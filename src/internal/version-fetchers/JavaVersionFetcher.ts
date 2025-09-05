import { onlyUnique } from '../utils.js'
import { JavaFullVersionFetcher } from './JavaFullVersionFetcher.js'
import { VersionFetchParams } from './VersionFetcher'

export class JavaVersionFetcher extends JavaFullVersionFetcher {

    async fetchVersions(params: VersionFetchParams): Promise<string[]> {
        return super.fetchVersions(params)
            .then(versions => versions
                .map(version => version.replace(/^(?<major>\d+).*$/, '$<major>'))
                .filter(onlyUnique),
            )
    }

}

