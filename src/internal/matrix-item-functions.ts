import * as core from '@actions/core'
import * as versionings from 'renovate/dist/modules/versioning'
import { VersioningApi } from 'renovate/dist/modules/versioning/types'
import { getRegexPredicate } from 'renovate/dist/util/string-match'
import { actionDebug } from './actionDebug'
import { MatrixItem, VersionOnlyFilter } from './config'
import { DEFAULT_VERSIONING } from './constants'
import { escapeRegex, isNotEmpty } from './utils'
import { fullSupportedVersionFetcherSuffix, getVersionFetcher, supportedVersionFetchers } from './version-fetcher-api'
import { isInVersioningRange } from './version-utils'

export interface FetchedMatrixItem extends MatrixItem {
    fetchedVersions: string[]
}

export type FetchedMatrix = Record<string, FetchedMatrixItem>

export async function fetchMatrix(matrix?: Record<string, MatrixItem>): Promise<FetchedMatrix> {
    const fetchedMatrix: FetchedMatrix = {}
    for (const [property, matrixItem] of Object.entries(matrix ?? {})) {
        const fetchedMatrixItem = await fetchMatrixItem(matrixItem)
        fetchedMatrix[property] = fetchedMatrixItem
    }
    return Promise.resolve(fetchedMatrix)
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

export async function fetchMatrixItem(matrixItem: MatrixItem): Promise<FetchedMatrixItem> {
    const { fetcherId, dependency } = parseMatrixItemDependency(matrixItem.dependency)

    const fetcher = getVersionFetcher(fetcherId)
    return fetcher.fetchVersions({
        dependency,
        repositories: matrixItem.repositories,
        only: matrixItem.only,
    })
        .then(versions => {
            if (!versions.length) {
                throw new Error(`No versions fetched for '${matrixItem.dependency}' dependency`)
            }
            return versions
        })
        .then(versions => {
            return {
                dependency: matrixItem.dependency,
                only: matrixItem.only?.concat(),
                include: matrixItem.include?.concat(),
                exclude: matrixItem.exclude?.concat(),
                versioning: matrixItem.versioning ?? fetcher.defaultVersioning,
                compatibilities: matrixItem.compatibilities?.concat(),
                fetchedVersions: versions,
            }
        })
        .then(filterFetchedVersions)
        .then(item => {
            if (!item.fetchedVersions.length) {
                const filterStrings: string[] = []
                if (isNotEmpty(item.only)) filterStrings.push(`only='${item.only.join('\', \'')}'`)
                if (isNotEmpty(item.include)) filterStrings.push(`include='${item.include.join('\', \'')}'`)
                if (isNotEmpty(item.exclude)) filterStrings.push(`exclude='${item.exclude.join('\', \'')}'`)
                const filterString = filterStrings.join('; ')
                throw new Error(`No versions left for '${item.dependency}' dependency after applying filters: ${filterString}`)
            }
            return item
        })
        .then(item => {
            core.info(`Fetched versions for '${item.dependency}' dependency: ${item.fetchedVersions.join(', ')}`)
            return item
        })
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

interface FilterRegexPredicate {
    filter: string
    predicate: (value: string) => boolean
}

export function filterFetchedVersions(fetchedMatrixItem: FetchedMatrixItem): FetchedMatrixItem {
    let fetchedVersions = fetchedMatrixItem.fetchedVersions

    actionDebug(`Processing fetched versions of '${fetchedMatrixItem.dependency}'`)

    const includePredicates: FilterRegexPredicate[] = []
    const includeRanges: string[] = []
    fetchedMatrixItem.include?.forEach(filter => {
        const filterRegexPredicate = getRegexPredicate(filter)
        if (filterRegexPredicate != null) {
            includePredicates.push({
                filter,
                predicate: filterRegexPredicate,
            })
        } else {
            includeRanges.push(filter)
        }
    })

    const excludePredicates: FilterRegexPredicate[] = []
    const excludeRanges: string[] = []
    fetchedMatrixItem.exclude?.forEach(filter => {
        const filterRegexPredicate = getRegexPredicate(filter)
        if (filterRegexPredicate != null) {
            excludePredicates.push({
                filter,
                predicate: filterRegexPredicate,
            })
        } else {
            excludeRanges.push(filter)
        }
    })

    if (includePredicates.length) {
        fetchedVersions = fetchedVersions.filter(version => {
            const filteringPredicate = includePredicates.find(it => it.predicate(version))
            if (filteringPredicate != null) {
                actionDebug(`  ${version} included by '${filteringPredicate.filter}' filter`)
                return true
            } else {
                return false
            }
        })
    }

    if (excludePredicates.length) {
        fetchedVersions = fetchedVersions.filter(version => {
            const filteringPredicate = excludePredicates.find(it => it.predicate(version))
            if (filteringPredicate != null) {
                actionDebug(`  ${version} excluded by '${filteringPredicate.filter}' filter`)
                return false
            } else {
                return true
            }
        })
    }

    const versioning = versionings.get(fetchedMatrixItem.versioning ?? DEFAULT_VERSIONING)
    fetchedVersions = fetchedVersions.filter(version => {
        if (!versioning.isVersion(version)) {
            core.warning(`Dependency '${fetchedMatrixItem.dependency}': `
                + `Skipping version '${version}', because it's unsupported by '${fetchedMatrixItem.versioning}' versioning. `
                + `Check that correct versioning setting is set for the dependency.`,
            )
            return false
        }
        return true
    })

    if (includeRanges.length) {
        fetchedVersions = fetchedVersions.filter(version => {
            const filteringRange = includeRanges.find(range => isInVersioningRange(
                versioning,
                fetchedMatrixItem.dependency,
                version,
                range,
            ))
            if (filteringRange != null) {
                actionDebug(`  ${version} included by '${filteringRange}' filter`)
                return true
            } else {
                return false
            }
        })
    }

    if (excludeRanges.length) {
        fetchedVersions = fetchedVersions.filter(version => {
            const filteringRange = excludeRanges.find(range => isInVersioningRange(
                versioning,
                fetchedMatrixItem.dependency,
                version,
                range,
            ))
            if (filteringRange != null) {
                actionDebug(`  ${version} excluded by '${filteringRange}' filter`)
                return false
            } else {
                return true
            }
        })
    }

    fetchedVersions = fetchedVersions.sort((v1, v2) => {
        if (versioning.isGreaterThan(v1, v2)) {
            return -1
        } else if (v1 === v2) {
            return 0
        } else {
            return 1
        }
    })

    for (const filter of (fetchedMatrixItem.only ?? [])) {
        const filterFunction = onlyFilterFactories[filter](versioning)
        const currentFetchedVersions = filterFunction(fetchedVersions)
        fetchedVersions.forEach(version => {
            if (!currentFetchedVersions.includes(version)) {
                actionDebug(`  ${version} excluded by '${filter}' only-filter`)
            }
        })
        fetchedVersions = currentFetchedVersions
    }

    fetchedMatrixItem.fetchedVersions = fetchedVersions

    return fetchedMatrixItem
}

type VersionsFilter = (versions: string[]) => string[]
type VersionsFilterFactory = (versioning: VersioningApi) => VersionsFilter

const onlyFilterFactories: Record<VersionOnlyFilter, VersionsFilterFactory> = {
    'lts': _ => versions => versions, // should be filtered in the fetcher
    'stable': versioning => versions => versions.filter(version => versioning.isStable(version)),
    'stable+current-unstable': versioning => versions => {
        let isFirst = true
        return versions.filter(version => {
            if (isFirst) {
                isFirst = false
                if (!versioning.isStable(version)) {
                    return true
                }
            }

            return versioning.isStable(version)
        })
    },
    'stable-majors': createNumbersOnlyFilterFactory(1, false),
    'stable-majors+current-unstable': createNumbersOnlyFilterFactory(1, true),
    'stable-minors': createNumbersOnlyFilterFactory(2, false),
    'stable-minors+current-unstable': createNumbersOnlyFilterFactory(2, true),
    'stable-patches': createNumbersOnlyFilterFactory(3, false),
    'stable-patches+current-unstable': createNumbersOnlyFilterFactory(3, true),
    'current-unstable': createNumbersOnlyFilterFactory(0, true),
}

function createNumbersOnlyFilterFactory(
    numbersToInclude: number,
    includeCurrentUnstable: boolean,
): VersionsFilterFactory {
    return versioning => versions => {
        let isFirst = true
        const processedMarkers = new Set<string>()
        return versions.filter(version => {
            if (isFirst) {
                isFirst = false
                if (includeCurrentUnstable && !versioning.isStable(version)) {
                    return true
                }
            }

            if (numbersToInclude < 1) return false

            if (!versioning.isStable(version)) return false

            const major = versioning.getMajor(version)?.toString()
            if (major == null) return false

            let marker = major
            if (numbersToInclude >= 2) {
                const minor = versioning.getMinor(version)?.toString() ?? '0'
                marker += `.` + minor
            }
            if (numbersToInclude >= 3) {
                const patch = versioning.getPatch(version)?.toString() ?? '0'
                marker += `.` + patch
            }

            if (processedMarkers.has(marker)) {
                return false
            } else {
                processedMarkers.add(marker)
                return true
            }
        })
    }
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

export interface ParsedDependency {
    fetcherId: string
    dependency: string
}

const dependencyRegex = /^(?<fetcherId>[^:]+)(:(?<dependency>.+))?$/

export function parseMatrixItemDependency(dependency: string): ParsedDependency {
    return {
        fetcherId: dependency.replace(dependencyRegex, '$<fetcherId>'),
        dependency: dependency.replace(dependencyRegex, '$<dependency>'),
    }
}

export function withoutFullFetcherSuffixDependency(dependency: string): string | undefined {
    const parsedDependency = parseMatrixItemDependency(dependency)
    const fetcherId = parsedDependency.fetcherId
    if (fetcherId.endsWith(fullSupportedVersionFetcherSuffix)) {
        const notFullFetcherId = fetcherId.substring(0, fetcherId.length - fullSupportedVersionFetcherSuffix.length)
        return createMatrixItemDependency({
            fetcherId: notFullFetcherId,
            dependency: parsedDependency.dependency,
        })
    }
    return undefined
}

export function withFullFetcherSuffixDependency(dependency: string): string | undefined {
    const parsedDependency = parseMatrixItemDependency(dependency)
    const fetcherId = parsedDependency.fetcherId
    if (!fetcherId.endsWith(fullSupportedVersionFetcherSuffix)) {
        const fullFetcherId = fetcherId + fullSupportedVersionFetcherSuffix
        if (supportedVersionFetchers.has(fullFetcherId)) {
            return createMatrixItemDependency({
                fetcherId: fullFetcherId,
                dependency: parsedDependency.dependency,
            })
        }
    }
    return undefined
}

export function isFullFetcherDependency(dependency: string): boolean {
    if (dependency.includes('*')) return false
    return parseMatrixItemDependency(dependency).fetcherId.endsWith(fullSupportedVersionFetcherSuffix)
}

export function createMatrixItemDependency(parsedDependency: ParsedDependency): string {
    if (isNotEmpty(parsedDependency.dependency)) {
        return `${parsedDependency.fetcherId}:${parsedDependency.dependency}`
    } else {
        return parsedDependency.fetcherId
    }
}


export function matchDependencies(dependency1: string, dependency2: string): boolean {
    if (!dependency1.includes('*') && !dependency2.includes('*')) {
        return dependency1 === dependency2
    }


    function patternToRegex(pattern: string): RegExp {
        pattern = escapeRegex(pattern)
        pattern = pattern
            .replaceAll('\\*', '.*')
        return new RegExp(`^${pattern}$`)
    }

    if (dependency1.includes('*')) {
        const regex1 = patternToRegex(dependency1)
        return regex1.exec(dependency2) != null

    } else {
        const regex2 = patternToRegex(dependency2)
        return regex2.exec(dependency1) != null
    }
}
