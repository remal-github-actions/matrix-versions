import { onlyUnique } from '../utils.js'
import { VersionFetchParams } from '../VersionFetcher.js'
import { NodeFullVersionFetcher } from './NodeFullVersionFetcher.js'

export class NodeVersionFetcher extends NodeFullVersionFetcher {

    async fetchVersions(params: VersionFetchParams): Promise<string[]> {
        return super.fetchVersions(params)
            .then(versions => versions
                .map(version => version.replace(/^v?(?<major>\d+).*$/, '$<major>'))
                .filter(onlyUnique),
            )
    }

}
