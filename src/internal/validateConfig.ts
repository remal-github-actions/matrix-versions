import Ajv2020 from 'ajv/dist/2020'
import configSchema from '../../config.schema.json'
import { Config } from './config'
import { processObjectFieldsRecursively } from './utils'

const sanitizedConfigSchema = JSON.parse(JSON.stringify(configSchema))
processObjectFieldsRecursively(sanitizedConfigSchema, (key, value) => {
    return key.startsWith('x-') ? undefined : value
})

const ajv = new Ajv2020()
const validate = ajv.compile(sanitizedConfigSchema)

export function validateConfig(config: unknown, configSource?: string): Config {
    const valid = validate(config)
    if (!valid) {
        throw new Error(`Config validation error`
            + (configSource != null ? ` (at ${configSource})` : ``)
            + `: ${JSON.stringify(validate.errors, null, 2)}`
        )
    }

    return config as unknown as Config
}
