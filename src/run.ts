import * as core from '@actions/core'
import { LogLevelString } from 'bunyan'
import os from 'node:os'
import { GlobalConfig } from 'renovate/dist/config/global'
import { AllConfig } from 'renovate/dist/config/types'
import { logger as renovateLogger } from 'renovate/dist/logger/index'
import { bootstrap as initProxyForRenovate } from 'renovate/dist/proxy'
import { HostRule } from 'renovate/dist/types/host-rules'
import * as renovateHostRules from 'renovate/dist/util/host-rules'
import { hostRulesFromEnv } from 'renovate/dist/workers/global/config/parse/host-rules-from-env'
import { Config } from './internal/config'
import {
    mergeConfigs,
    parseConfigContent,
    parseConfigFiles,
    populateGlobalCompatibilities,
    validateConfig,
} from './internal/config-functions'
import { composeVersionMatrix } from './internal/matrix-functions'
import { fetchMatrix } from './internal/matrix-item-functions'
import { indent, isNotEmpty, normalizeSpaces, processObjectFieldsRecursively } from './internal/utils'

const defaultCompatibilitiesConfig = validateConfig(
    require('../global-compatibilities.json'),
    'builtin:global-compatibilities.json',
)

export async function run(
    githubToken: string | undefined | null,
    configFiles: string[],
    configContent: string
) {
    try {
        // Init config:
        const config = mergeConfigs(
            parseConfigContent(configContent),
            await parseConfigFiles(...configFiles),
            defaultCompatibilitiesConfig
        )
        populateGlobalCompatibilities(config)


        // Init Renovate:
        process.env.RENOVATE_X_IGNORE_RE2 = 'true'
        process.env.TMPDIR = process.env.RENOVATE_TMPDIR ?? os.tmpdir()
        initRenovateLogging()
        initRenovateConfig(config, githubToken)
        initProxyForRenovate()


        // Execute logic:
        const fetchedMatrix = await fetchMatrix(config.matrix)
        const versionMatrix = composeVersionMatrix(fetchedMatrix)
        console.log(JSON.stringify(versionMatrix, null, 2))

    } catch (error) {
        core.setFailed(error instanceof Error ? error : (error as object).toString())
        throw error
    }
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function initRenovateLogging() {
    const loggerLevels: LogLevelString[] = [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
    ]

    const metaFieldsToMask = [
        'token',
        'password',
    ]

    for (const loggerLevel of loggerLevels) {
        renovateLogger[loggerLevel.toString()] = (meta, msg) => {
            if (msg == null) {
                msg = meta
                meta = {}
            }
            if (meta == null) {
                meta = {}
            }
            if (msg == null) {
                msg = ''
            } else {
                msg = msg.toString()
            }

            if (isNotEmpty(meta)) {
                const metaJson = JSON.stringify(meta)
                meta = JSON.parse(metaJson)
                processObjectFieldsRecursively(meta, (key, value) => {
                    return metaFieldsToMask.includes(key) ? '****' : value
                })

                msg = msg + '\n' + indent(normalizeSpaces(JSON.stringify(meta, null, 2)), 2)
            }

            msg = msg.trim()
            if (!msg.length) {
                return
            }

            msg = `Renovate ${loggerLevel.toUpperCase()}: ${msg}`

            if (loggerLevel === 'trace' || loggerLevel === 'debug') {
                core.debug(msg)
            } else if (loggerLevel === 'info') {
                core.info(msg)
            } else if (loggerLevel === 'warn') {
                core.warning(msg)
            } else {
                throw new Error(msg)
            }
        }
    }

    for (const loggerLevel of loggerLevels) {
        renovateLogger.once[loggerLevel] = renovateLogger[loggerLevel]
    }
}

function initRenovateConfig(config: Config, githubToken?: string | null) {
    const renovateConfig: AllConfig = {}
    renovateConfig.githubTokenWarn = true
    renovateConfig.fetchReleaseNotes = false
    renovateConfig.repositoryCache = 'disabled'
    renovateConfig.dryRun = 'full'


    const defaultHostRule: HostRule = {
        timeout: 10_000,
        abortOnError: true,
    }
    const hostRules: HostRule[] = renovateConfig.hostRules = [defaultHostRule]

    config.auth?.forEach(hostAuth => {
        const hostRule: HostRule = {
            matchHost: hostAuth.host,
            hostType: hostAuth.type,
            token: hostAuth.token,
            username: hostAuth.username,
            password: hostAuth.password,
        }
        hostRules.push(hostRule)
    })
    delete config.auth

    hostRules.push(...hostRulesFromEnv(process.env))

    if (isNotEmpty(githubToken)) {
        hostRules.push({
            matchHost: new URL(process.env.GITHUB_SERVER_URL ?? 'https://github.com/').hostname,
            token: githubToken,
        })
        hostRules.push({
            matchHost: new URL(process.env.GITHUB_API_URL ?? 'https://api.github.com/').hostname,
            token: githubToken,
        })
    }

    hostRules.forEach(hostRule => {
        hostRule.timeout = defaultHostRule.timeout
        hostRule.abortOnError = defaultHostRule.abortOnError
    })

    hostRules.forEach((rule) => renovateHostRules.add(rule))


    GlobalConfig.set(renovateConfig)
}
