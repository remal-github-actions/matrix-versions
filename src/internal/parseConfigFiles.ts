import * as glob from '@actions/glob'
import { Config } from './config'
import { mergeConfigs } from './mergeConfigs'
import { newEmptyConfig } from './newEmptyConfig'
import { parseConfigFile } from './parseConfigFile'

export async function parseConfigFiles(...configFileGlobs: string[]): Promise<Config> {
    configFileGlobs = configFileGlobs
        .flatMap(it => it.split(/[\r\n]+/))
        .map(it => it.trim())
        .filter(it => it.length)
    if (!configFileGlobs.length) {
        return Promise.resolve(newEmptyConfig())
    }

    return glob.create(configFileGlobs.join('\n'))
        .then(globber => globber.glob())
        .then(paths => paths.map(path => parseConfigFile(path)))
        .then(promises => Promise.all(promises))
        .then(configs => mergeConfigs(...configs))
}
