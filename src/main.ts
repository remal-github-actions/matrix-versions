import * as core from '@actions/core'
import { Config } from './internal/config'
import { byNewLineAndComma, indent, isNotEmpty } from './internal/utils'

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./internal/initRenovateLogging').initRenovateLogging()

const batchLimit = 256
const batchNumbers = 10

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

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./run').run(
    batchLimit,
    batchNumbers,
    githubToken,
    configFiles,
    configContent,
)
