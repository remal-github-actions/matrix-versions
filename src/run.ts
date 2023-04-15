import * as core from '@actions/core'
import { LogLevelString } from 'bunyan'
import fs from 'fs-extra'
import os from 'node:os'
import { GlobalConfig } from 'renovate/dist/config/global'
import { AllConfig } from 'renovate/dist/config/types'
import { logger as renovateLogger } from 'renovate/dist/logger/index'
import { bootstrap as bootstrapRenovate } from 'renovate/dist/proxy'
import { HostRule } from 'renovate/dist/types/host-rules'
import * as renovateHostRules from 'renovate/dist/util/host-rules'
import { hostRulesFromEnv } from 'renovate/dist/workers/global/config/parse/host-rules-from-env'
import upath from 'upath'
import { mergeConfigs } from './internal/mergeConfigs'
import { parseConfigContent } from './internal/parseConfigContent'
import { parseConfigFiles } from './internal/parseConfigFiles'
import { isNotEmpty, processObjectFieldsRecursively } from './internal/utils'

export async function run(
    githubToken,
    configFiles: string[],
    configContent: string
) {
    try {
        // Init the action's config:
        let config = await parseConfigFiles(...configFiles)
        config = mergeConfigs(parseConfigContent(configContent), config)


        // Init Renovate:
        process.env.TMPDIR = process.env.RENOVATE_TMPDIR ?? os.tmpdir()
        initRenovateLogging()
        bootstrapRenovate()


        // Init Renovate config:
        const renovateConfig: AllConfig = {}
        await fs.ensureDir(renovateConfig.baseDir = upath.join(process.env.TMPDIR, 'renovate'))
        await fs.ensureDir(renovateConfig.cacheDir = upath.join(renovateConfig.baseDir, 'cache'))
        await fs.ensureDir(renovateConfig.containerbaseDir = upath.join(renovateConfig.baseDir, 'containerbase'))
        renovateConfig.githubTokenWarn = true
        renovateConfig.fetchReleaseNotes = false
        renovateConfig.repositoryCache = 'disabled'


        const defaultHostRule: HostRule = {
            timeout: 10_000,
            abortOnError: true,
        }
        const hostRules = renovateConfig.hostRules = [defaultHostRule]
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
        hostRules.push(...hostRulesFromEnv(process.env))
        hostRules.push({
            matchHost: new URL(process.env.GITHUB_SERVER_URL || 'https://github.com/').hostname,
            token: githubToken,
        })
        hostRules.push({
            matchHost: new URL(process.env.GITHUB_API_URL || 'https://api.github.com/').hostname,
            token: githubToken,
        })
        hostRules.forEach(hostRule => {
            hostRule.timeout = defaultHostRule.timeout
            hostRule.abortOnError = defaultHostRule.abortOnError
        })

        hostRules.forEach((rule) => renovateHostRules.add(rule))

        GlobalConfig.set(renovateConfig)

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

    const disabledMessages: RegExp[] = [
        /^Converting .+ into a global host rule$/,
        /^Found valid .+ version: .+$/,
        /^Using default .+ endpoint: .+$/,
        /^Adding token authentication for .+ to hostRules$/,
    ]

    const enabledTraceMessages: RegExp[] = [
        /^Host disabled$/,
        /^Url not found$/,
        /^go-source header prefix not match$/,
        /^go-import header prefix not match$/,
        /^datasource hunt failure$/,
        /^datasource merge failure$/,
        /^S3 url not found$/,
        /^pip package not found$/,

        /^Can't get datasource for .+$/,
        /^Can't obtain data from .+$/,
        /^Failed to retrieve .+$/,
        /^No builds found for .+$/,
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

            if (disabledMessages.some(regex => regex.test(msg))) {
                return
            }

            if (loggerLevel === 'trace') {
                if (enabledTraceMessages.some(regex => regex.test(msg))) {
                    // do nothing
                } else {
                    return
                }
            }

            if (isNotEmpty(meta)) {
                const metaJson = JSON.stringify(meta)
                meta = JSON.parse(metaJson)
                processObjectFieldsRecursively(meta, (key, value) => {
                    return metaFieldsToMask.includes(key) ? '****' : value
                })

                msg = JSON.stringify(meta) + ' ' + msg
            }

            msg = msg.trim()
            if (msg.length) {
                throw new Error(`Renovate ${loggerLevel.toUpperCase()}: ${msg}`)
            }
        }
    }

    for (const loggerLevel of loggerLevels) {
        renovateLogger.once[loggerLevel] = renovateLogger[loggerLevel]
    }
}
