import * as core from '@actions/core'

export function actionDebug(message: string) {
    if (process.env.HIDE_ACTION_DEBUG) {
        return
    }

    core.debug(message)
}
