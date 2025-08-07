import * as core from '@actions/core'
import os from 'node:os'
import { GlobalConfig } from 'renovate/dist/config/global.js'
import { AllConfig } from 'renovate/dist/config/types.js'
import { bootstrap as initProxyForRenovate } from 'renovate/dist/proxy.js'
import { HostRule } from 'renovate/dist/types/host-rules.js'
import * as renovateHostRules from 'renovate/dist/util/host-rules.js'
import { hostRulesFromEnv } from 'renovate/dist/workers/global/config/parse/host-rules-from-env.js'
import { defaultCompatibilitiesConfig } from './defaultCompatibilitiesConfig.js'
import {
    mergeConfigs,
    parseConfigContent,
    parseConfigFiles,
    populateGlobalCompatibilities,
    processGlobalCompatibilityAliases,
} from './internal/config-functions.js'
import { Config } from './internal/config.js'
import { initRenovateLogging } from './internal/initRenovateLogging.js'
import { composeVersionMatrix, VersionMatrixItem } from './internal/matrix-functions.js'
import { fetchMatrix } from './internal/matrix-item-functions.js'
import { isNotEmpty } from './internal/utils.js'

export async function run(
    batchLimit: number,
    batchNumbers: number,
    githubToken: string | undefined | null,
    configFiles: string[],
    configContent: string,
): Promise<VersionMatrixItem[]> {
    try {
        // Init config:
        const config = mergeConfigs(
            parseConfigContent(configContent),
            await parseConfigFiles(...configFiles),
            defaultCompatibilitiesConfig,
        )
        processGlobalCompatibilityAliases(config)
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
        core.setOutput('allMatrixIncludes', versionMatrix)

        const versionMatrixLength = versionMatrix.length
        if (versionMatrixLength > batchLimit) {
            core.error(
                `Version, matrix consists of ${versionMatrixLength} elements`
                + `, which is greater than GitHub supports: ${batchLimit}. `
                + `Use batching mode.`,
            )
        } else if (versionMatrixLength > batchLimit / 2) {
            core.error(
                `Version, matrix consists of ${versionMatrixLength} elements`
                + `, which is more than a half of what GitHub supports: ${batchLimit}. `
                + `Consider using batching mode.`,
            )
        }

        for (let batchNumber = 1; batchNumber <= batchNumbers; ++batchNumber) {
            const batchElements: VersionMatrixItem[] = []
            for (
                let i = batchLimit * (batchNumber - 1);
                i < Math.min(versionMatrix.length, batchLimit * batchNumber);
                ++i
            ) {
                batchElements.push(versionMatrix[i])
            }
            core.setOutput(`batchMatrixIncludes${batchNumber}`, batchElements)
        }

        return versionMatrix

    } catch (error) {
        core.setFailed(error instanceof Error ? error : (error as any).toString())
        throw error
    }
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

function initRenovateConfig(config: Config, githubToken?: string | null) {
    const renovateConfig: AllConfig = {}
    renovateConfig.githubTokenWarn = false
    renovateConfig.fetchReleaseNotes = 'off'
    renovateConfig.vulnerabilityAlerts = { enabled: true }
    renovateConfig.osvVulnerabilityAlerts = false
    renovateConfig.constraintsFiltering = 'none'
    renovateConfig.repositoryCache = 'disabled'
    renovateConfig.dryRun = 'full'


    const defaultHostRule: HostRule = {
        timeout: 60_000,
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
