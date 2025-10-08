import * as core from '@actions/core'
import { Config } from './internal/config.js'
import { initRenovateLogging } from './internal/initRenovateLogging.js'
import { byNewLineAndComma, indent, isNotEmpty } from './internal/utils.js'
import { run } from './run.js'

initRenovateLogging()

const githubToken = core.getInput('githubToken', { required: false })

const elementsPerBatch = Number.parseInt(core.getInput('elementsPerBatch', { required: false }) || '256')
const batchesCount = 9

const allowEmptyResult = core.getInput('allowEmptyResult', { required: false })?.toLowerCase() === 'true'

const configFiles = core.getInput('files', { required: false })
    .split(byNewLineAndComma)
    .map(it => it.trim())
    .filter(isNotEmpty)

const configContent = (function() {
    const strings: Record<keyof Config, string> = {
        matrix: 'matrix',
        auth: 'auth',
        globalCompatibilities: 'globalCompatibilities',
        globalCompatibilityAliases: 'globalCompatibilityAliases',
    }
    Object.keys(strings).forEach(key => {
        strings[key] = core.getInput(key, { required: false, trimWhitespace: false })
    })

    const lines: string[] = []
    for (const [property, string] of Object.entries(strings)) {
        if (string.trim().length) {
            lines.push(
                `${property}:`,
                indent(string, 2),
            )
        }
    }
    return lines.join('\n')
})()

async function main(): Promise<void> {
    try {
        await run(
            elementsPerBatch,
            batchesCount,
            githubToken,
            configFiles,
            configContent,
            allowEmptyResult,
        )

    } catch (error) {
        core.setFailed(error instanceof Error ? error : (error as any).toString())
        throw error
    }
}

//noinspection JSIgnoredPromiseFromCall
main()

