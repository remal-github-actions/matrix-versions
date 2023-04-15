import YAML from 'yaml'
import { Config } from './config'
import { newEmptyConfig } from './newEmptyConfig'
import { validateConfig } from './validateConfig'

export function parseConfigContent(content: string, configSource?: string): Config {
    if (!content.trim().length) {
        return newEmptyConfig()
    }

    const parsedData = YAML.parse(content)
    delete parsedData.$schema
    return validateConfig(parsedData, configSource)
}
