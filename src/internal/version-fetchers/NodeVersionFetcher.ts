import { onlyUnique } from '../utils'
import { VersionFetchParams } from '../VersionFetcher'
import { NodeFullVersionFetcher } from './NodeFullVersionFetcher'

export class NodeVersionFetcher extends NodeFullVersionFetcher {

    async fetchVersions(params: VersionFetchParams): Promise<string[]> {
        return super.fetchVersions(params)
            .then(versions => versions
                .map(version => version.replace(/^v?(?<major>\d+).*$/, '$<major>'))
                .filter(onlyUnique),
            )
    }

}
