import * as core from '@actions/core'
import * as versionings from 'renovate/dist/modules/versioning'
import { VersioningApi } from 'renovate/dist/modules/versioning/types'
import { configRegexPredicate } from 'renovate/dist/util/regex'
import { MatrixItem, VersionOnlyFilter } from './config'
import { isNotEmpty } from './utils'
import { fullSupportedVersionFetcherSuffix, getVersionFetcher, supportedVersionFetchers } from './version-fetcher-api'
import { isCompatibleForVersioning } from './version-utils'

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
        .then(fetchedVersions => {
            return {
                dependency: matrixItem.dependency,
                only: matrixItem.only?.concat(),
                include: matrixItem.include?.concat(),
                exclude: matrixItem.exclude?.concat(),
                versioning: matrixItem.versioning ?? fetcher.defaultVersioning,
                compatibilities: matrixItem.compatibilities?.concat(),
                fetchedVersions,
            }
        })
        .then(filterFetchedVersions)
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

type FilterRegexPredicate = (s: string) => boolean

export function filterFetchedVersions(fetchedMatrixItem: FetchedMatrixItem): FetchedMatrixItem {
    let fetchedVersions = fetchedMatrixItem.fetchedVersions

    const includePredicates: FilterRegexPredicate[] = []
    const includeRanges: string[] = []
    fetchedMatrixItem.include?.forEach(filter => {
        const filterRegexPredicate = configRegexPredicate(filter)
        if (filterRegexPredicate != null) {
            includePredicates.push(filterRegexPredicate)
        } else {
            includeRanges.push(filter)
        }
    })

    const excludePredicates: FilterRegexPredicate[] = []
    const excludeRanges: string[] = []
    fetchedMatrixItem.exclude?.forEach(filter => {
        const filterRegexPredicate = configRegexPredicate(filter)
        if (filterRegexPredicate != null) {
            excludePredicates.push(filterRegexPredicate)
        } else {
            excludeRanges.push(filter)
        }
    })

    if (includePredicates.length) {
        fetchedVersions = fetchedVersions.filter(version => {
            return includePredicates.some(predicate => predicate(version))
        })
    }

    if (excludePredicates.length) {
        fetchedVersions = fetchedVersions.filter(version => {
            return !excludePredicates.some(predicate => predicate(version))
        })
    }

    const versioning = versionings.get(fetchedMatrixItem.versioning)
    fetchedVersions = fetchedVersions.filter(version => {
        if (!versioning.isVersion(version)) {
            core.warning(`Dependency '${fetchedMatrixItem.dependency}': `
                + `Skipping version '${version}', because it's unsupported by '${fetchedMatrixItem.versioning}' versioning`
            )
            return false
        }
        return true
    })

    if (includeRanges.length) {
        fetchedVersions = fetchedVersions.filter(version => {
            return includeRanges.some(range => isCompatibleForVersioning(
                versioning,
                fetchedMatrixItem.dependency,
                version,
                range,
            ))
        })
    }

    if (excludeRanges.length) {
        fetchedVersions = fetchedVersions.filter(version => {
            return !excludeRanges.some(range => isCompatibleForVersioning(
                versioning,
                fetchedMatrixItem.dependency,
                version,
                range,
            ))
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

    const onlyFilters = (fetchedMatrixItem.only ?? [])
        .map(filter => onlyFilterFactories[filter](versioning))
    if (onlyFilters.length) {
        for (const onlyFilter of onlyFilters) {
            fetchedVersions = onlyFilter(fetchedVersions)
        }
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
    includeCurrentUnstable: boolean
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
    return parseMatrixItemDependency(dependency).fetcherId.endsWith(fullSupportedVersionFetcherSuffix)
}

export function createMatrixItemDependency(parsedDependency: ParsedDependency): string {
    if (isNotEmpty(parsedDependency.dependency)) {
        return `${parsedDependency.fetcherId}:${parsedDependency.dependency}`
    } else {
        return parsedDependency.fetcherId
    }
}
