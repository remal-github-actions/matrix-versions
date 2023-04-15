import { promises as fs } from 'fs'
import { Config } from './config'
import { parseConfigContent } from './parseConfigContent'

export async function parseConfigFile(configFilePath: string): Promise<Config> {
    return fs.readFile(configFilePath, 'utf8')
        .then(configContent => parseConfigContent(configContent, configFilePath))
}
