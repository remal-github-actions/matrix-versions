import * as core from '@actions/core'
import { Config } from './internal/config.js'
import { initRenovateLogging } from './internal/initRenovateLogging.js'
import { byNewLineAndComma, indent, isNotEmpty } from './internal/utils.js'
import { run } from './run.js'

initRenovateLogging()

const batchLimit = parseInt(core.getInput('batchLimit', { required: false }) ?? '256')
const batchNumbers = 9

const githubToken = core.getInput('githubToken', { required: false })

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
            lines.push(`${property}:`)
            lines.push(indent(string, 2))
        }
    }
    return lines.join('\n')
})()

run(
    batchLimit,
    batchNumbers,
    githubToken,
    configFiles,
    configContent,
)
