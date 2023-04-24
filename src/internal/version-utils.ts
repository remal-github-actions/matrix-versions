import * as core from '@actions/core'
import { VersioningApi } from 'renovate/dist/modules/versioning/types'

export const INCOMPATIBLE_RANGE = 'incompatible' as const

export function isInVersioningRange(
    versioning: VersioningApi,
    dependency: string,
    version: string,
    range: string,
): boolean {
    if (range === INCOMPATIBLE_RANGE) return false

    if (!versioning.isValid(range)) {
        core.error(`Invalid version range for '${dependency}': '${range}'`)
        return false
    }

    return versioning.getSatisfyingVersion([version], range) != null
}
