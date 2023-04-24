import * as core from '@actions/core'
import { LogLevelString } from 'bunyan'
import { logger as renovateLogger } from 'renovate/dist/logger/index'
import { indent, isNotEmpty, normalizeSpaces, processObjectFieldsRecursively } from './utils'

export function initRenovateLogging() {
    const hideTrace = true

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

    const levelMessagesToHide: Partial<Record<LogLevelString, RegExp[]>> = {
        warn: [
            /^RE2 not usable, falling back to RegExp$/,
        ],
    }

    for (const loggerLevel of loggerLevels) {
        renovateLogger[loggerLevel.toString()] = (meta, msg) => {
            if (hideTrace && loggerLevel === 'trace') {
                return
            }

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

            const messagesToHide = levelMessagesToHide[loggerLevel]
            if (messagesToHide?.some(regex => msg.match(regex))) {
                return
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
                core.debug(msg)
                //core.info(msg)
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
