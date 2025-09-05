import * as glob from '@actions/glob'
import { Ajv2020, ValidateFunction } from 'ajv/dist/2020.js'
import merge from 'deepmerge'
import { promises as fs } from 'fs'
import YAML from 'yaml'
import configSchema from '../../config.schema.json'
import { CompatibilityItem, Config, MatrixItem } from './config.js'
import { matchDependencies } from './matrix-item-functions.js'
import { byNewLineAndComma, isNotEmpty, onlyUnique, processObjectFieldsRecursively } from './utils.js'

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
    for (const matrixItem of Object.values(matrix)) {
        matrixItem.only = matrixItem.only?.filter(onlyUnique)
        matrixItem.include = matrixItem.include?.filter(onlyUnique)
        matrixItem.exclude = matrixItem.exclude?.filter(onlyUnique)
        matrixItem.repositories = matrixItem.repositories?.filter(onlyUnique)
    }

    for (const [property, matrixItem] of Object.entries(matrix)) {
        const filters = matrixItem.only
        if (filters == null || filters.length <= 1) {
            continue
        }

        if (filters.includes('current-unstable')) {
            throw throwValidationError(`Matrix item ${property}: `
                + `'only' filter current-unstable`
                + ` conflict with ${filters.filter(it => it !== 'current-unstable').join(', ')}`,
            )
        }

        const withLtsFilters = filters.filter(filter => filter.match('lts'))
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
    if (!isNotEmpty(compatibilityAliases)) {
        return
    }

    const compatibilities = (config.globalCompatibilities ??= {})

    for (const [aliasDependency, alias] of Object.entries(compatibilityAliases)) {
        const aliasCompatibilities = compatibilities[alias]
        if (aliasCompatibilities == null) {
            throw new Error(`Dependency not found for global compatibility alias: ${alias}`)
        }

        for (const compatibilityDependency of Object.keys(compatibilities)) {
            if (matchDependencies(compatibilityDependency, aliasDependency)) {
                throw new Error(`Dependency alias is set for '${aliasDependency}', which has global compatibilities defined`)
            }
        }

        compatibilities[aliasDependency] = aliasCompatibilities
    }
}

// TODO: test separately
export function populateGlobalCompatibilities(config: Config): void {
    const allGlobalCompatibilities = config.globalCompatibilities ?? {}
    const globalCompatibilityAliases = config.globalCompatibilityAliases ?? {}
    for (const [dependency, aliasRef] of Object.entries(globalCompatibilityAliases)) {
        if (allGlobalCompatibilities[dependency] != null) {
            throw new Error(`Alias ${dependency} redefining global compatibility`)
        }

        const aliasCompatibilities = allGlobalCompatibilities[aliasRef]
        if (aliasCompatibilities == null) {
            throw new Error(`No global compatibilities set for alias ${dependency}`)
        }

        allGlobalCompatibilities[dependency] = aliasCompatibilities
    }

    for (const matrixItem of Object.values(config.matrix ?? {})) {
        if (matrixItem.withoutGlobalCompatibilities) {
            continue
        }

        const itemCompatibilities = (matrixItem.compatibilities ??= [])

        for (const [dependency, globalCompatibilities] of Object.entries(allGlobalCompatibilities)) {
            if (matchDependencies(dependency, matrixItem.dependency)) {
                globalCompatibilities.forEach(it => itemCompatibilities.push(it))
            }
        }

        for (const itemCompatibility of [...itemCompatibilities]) {
            for (const [aliasDependency, aliasRef] of Object.entries(globalCompatibilityAliases)) {
                if (matchDependencies(aliasRef, itemCompatibility.dependency)) {
                    const aliasCompatibility: CompatibilityItem = {
                        ...itemCompatibility,
                        dependency: aliasDependency,
                    }
                    itemCompatibilities.push(aliasCompatibility)
                }
            }
        }
    }
}
