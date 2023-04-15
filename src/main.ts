import * as core from '@actions/core'
import { run } from './run'

const githubToken = core.getInput('githubToken', { required: true })

const configFiles = core.getInput('files', { required: false })
    .split(/[\n\r,;]+/)
    .map(it => it.trim())
    .filter(it => it.length)

const configContent = (function() {
    const matrixString = core.getInput('matrix', { required: false, trimWhitespace: false })
    const authString = core.getInput('auth', { required: false, trimWhitespace: false })

    const lines: string[] = []
    if (matrixString.trim().length) {
        lines.push('matrix:')
        matrixString.split(/(\r\n)|(\n\r)|\n|\r/)
            .forEach(line => lines.push(`  ${line}`))
    }
    if (authString.trim().length) {
        lines.push('auth:')
        matrixString.split(/(\r\n)|(\n\r)|\n|\r/)
            .forEach(line => lines.push(line))
    }
    return lines.join('\n')
})()

run(
    githubToken,
    configFiles,
    configContent
)
