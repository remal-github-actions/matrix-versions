import * as glob from '@actions/glob'
import { Ajv2020, ValidateFunction } from 'ajv/dist/2020.js'
import merge from 'deepmerge'
import { promises as fs } from 'fs'
import YAML from 'yaml'
import configSchema from '../../config.schema.json'
import { Config, MatrixItem } from './config.js'
import { matchDependencies } from './matrix-item-functions.js'
import { byNewLineAndComma, isNotEmpty, processObjectFieldsRecursively } from './utils.js'

const validateFunction: ValidateFunction = (function() {
    const sanitizedConfigSchema = JSON.parse(JSON.stringify(configSchema))
    processObjectFieldsRecursively(sanitizedConfigSchema, (key, value) => {
        return key.startsWith('x-') ? undefined : value
    })

    const ajv = new Ajv2020()
    return ajv.compile(sanitizedConfigSchema)
})()

export function validateConfig(config: any, configSource?: string): Config {
    function throwValidationError(message: string) {
        throw new Error(
            `Config validation error` + (configSource != null ? ` (at ${configSource})` : ``) + ': ' + message,
        )
    }

    if (config != null) {
        delete config.$schema
    }

    const valid = validateFunction(config)
    if (!valid) {
        throw throwValidationError(
            JSON.stringify(validateFunction.errors, null, 2),
        )
    }

    config = config as Config

    const matrix: Record<string, MatrixItem> = config.matrix ?? {}
    for (const [property, matrixItem] of Object.entries(matrix)) {
        const filters = matrixItem.only
        if (filters == null || filters.length <= 1) continue

        if (filters.includes('current-unstable')) {
            throw throwValidationError(`Matrix item ${property}: `
                + `'only' filter current-unstable`
                + ` conflict with ${filters.filter(it => it !== 'current-unstable').join(', ')}`,
            )
        }

        const withLtsFilters = filters.filter(filter => filter.match(/\blts\b/))
        const withUnstableFilters = filters.filter(filter => filter.match(/\bunstable\b/))
        if (withLtsFilters.length && withUnstableFilters.length) {
            throw throwValidationError(`Matrix item ${property}: `
                + `'only' filters ${withLtsFilters.join(', ')}`
                + ` conflict with ${withUnstableFilters.join(', ')}`,
            )
        }

        const withStableWithoutUnstableFilters = filters
            .filter(filter => filter.match(/\bstable\b/) && !filter.match(/\bunstable\b/))
        if (withStableWithoutUnstableFilters.length && withUnstableFilters.length) {
            throw throwValidationError(`Matrix item ${property}: `
                + `'only' filters ${withStableWithoutUnstableFilters.join(', ')}`
                + ` conflict with ${withUnstableFilters.join(', ')}`,
            )
        }

        const withSubStableFilters = filters.filter(filter => filter.match(/(\bstable-|-stable\b)/))
        if (withSubStableFilters.length >= 2) {
            throw throwValidationError(`Matrix item ${property}: `
                + `'only' filters ${withSubStableFilters.join(', ')} conflict`,
            )
        }
    }

    return config
}

export function newEmptyConfig(): Config {
    return {}
}

export function mergeConfigs(...configs: Config[]): Config {
    if (!configs.length) {
        return newEmptyConfig()
    }

    return merge.all(configs)
}

export function parseConfigContent(content: string, configSource?: string): Config {
    if (!content.trim().length) {
        return newEmptyConfig()
    }

    const parsedData = YAML.parse(content)
    return validateConfig(parsedData, configSource)
}

export async function parseConfigFile(configFilePath: string): Promise<Config> {
    return fs.readFile(configFilePath, 'utf8')
        .then(configContent => parseConfigContent(configContent, configFilePath))
}

export async function parseConfigFiles(...configFileGlobs: string[]): Promise<Config> {
    configFileGlobs = configFileGlobs
        .flatMap(it => it.split(byNewLineAndComma))
        .map(it => it.trim())
        .filter(isNotEmpty)
    if (!configFileGlobs.length) {
        return Promise.resolve(newEmptyConfig())
    }

    return glob.create(configFileGlobs.join('\n'))
        .then(globber => globber.glob())
        .then(paths => paths.map(path => parseConfigFile(path)))
        .then(promises => Promise.all(promises))
        .then(configs => mergeConfigs(...configs))
}

export function processGlobalCompatibilityAliases(config: Config): void {
    const compatibilityAliases = config.globalCompatibilityAliases
    delete config.globalCompatibilityAliases
    if (!isNotEmpty(compatibilityAliases)) return

    const compatibilities = config.globalCompatibilities = config.globalCompatibilities ?? {}

    for (const [dependency, alias] of Object.entries(compatibilityAliases)) {
        const aliasCompatibilities = compatibilities[alias]
        if (aliasCompatibilities == null) {
            throw new Error(`Dependency not found for global compatibility alias: ${alias}`)
        }

        for (const compatibilityDependency of Object.keys(compatibilities)) {
            if (matchDependencies(compatibilityDependency, dependency)) {
                throw new Error(`Dependency alias is set for '${dependency}', which has global compatibilities defined`)
            }
        }

        compatibilities[dependency] = aliasCompatibilities
    }
}

export function populateGlobalCompatibilities(config: Config): void {
    const compatibilities = config.globalCompatibilities
    delete config.globalCompatibilities
    if (!isNotEmpty(compatibilities)) return

    const matrix = config.matrix
    if (!isNotEmpty(matrix)) return

    for (const matrixItem of Object.values(matrix)) {
        if (matrixItem.withoutGlobalCompatibilities) continue

        for (const [compatibilityDependency, compatibility] of Object.entries(compatibilities)) {
            if (!isNotEmpty(compatibility)) continue
            if (matchDependencies(compatibilityDependency, matrixItem.dependency)) {
                matrixItem.compatibilities = (matrixItem.compatibilities ?? []).concat(compatibility)
            }
        }
    }
}
