import * as merge from 'deepmerge'
import { Config } from './config'
import { newEmptyConfig } from './newEmptyConfig'

export function mergeConfigs(...configs: Config[]): Config {
    if (!configs.length) {
        return newEmptyConfig()
    }

    return merge.all(configs)
}
