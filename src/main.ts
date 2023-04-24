import * as core from '@actions/core'
import { Config } from './internal/config'
import { byNewLineAndComma, indent, isNotEmpty, normalizeSpaces } from './internal/utils'
import { run } from './run'

const githubToken = core.getInput('githubToken', { required: false })

const configFiles = core.getInput('files', { required: false })
    .split(byNewLineAndComma)
    .map(it => it.trim())
    .filter(isNotEmpty)

const configContent = (function() {
    const strings: Record<keyof Config, string> = {
        matrix: core.getInput('matrix', { required: false, trimWhitespace: false }),
        auth: core.getInput('auth', { required: false, trimWhitespace: false }),
        globalCompatibilities: core.getInput('globalCompatibilities', { required: false, trimWhitespace: false }),
    }

    const lines: string[] = []
    for (const [property, string] of Object.entries(strings)) {
        if (string.trim().length) {
            lines.push(`${property}:`)
            lines.push(indent(normalizeSpaces(string), 2))
        }
    }
    return lines.join('\n')
})()

const batchLimit = 256

run(
    githubToken,
    configFiles,
    configContent,
    batchLimit,
)
