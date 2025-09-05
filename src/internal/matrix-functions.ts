import * as versionings from 'renovate/dist/modules/versioning'
import { CompatibilityItem } from './config.js'
import { DEFAULT_VERSIONING } from './constants.js'
import { FetchedMatrix, matchDependencies } from './matrix-item-functions.js'
import { isNotEmpty, removeFromArrayIf, substringBefore, toSortedByKey } from './utils.js'
import { isInVersioningRange } from './version-utils.js'

export type VersionMatrixItem = Record<string, string>

export function composeVersionMatrix(fetchedMatrix: FetchedMatrix): VersionMatrixItem[] {
    removeUnusedCompatibilities(fetchedMatrix)
    normalizeCompatibilities(fetchedMatrix)
    copyCompatibilitiesToDependent(fetchedMatrix)

    const originalPropertiesOrder = Object.fromEntries(
        Object.keys(fetchedMatrix)
            .map((key, index) => [key, index]),
    )


    const versionMatrix: VersionMatrixItem[] = []
    composeVersionMatrixIn(versionMatrix, fetchedMatrix)


    versionMatrix.forEach((item, index) => {
        versionMatrix[index] = toSortedByKey(
            item,
            (k1, k2) => (originalPropertiesOrder[k1] ?? 9999) - (originalPropertiesOrder[k2] ?? 9999),
        )
    })

    return versionMatrix
}

export function removeUnusedCompatibilities(fetchedMatrix: FetchedMatrix): void {
    const matrixItems = Object.values(fetchedMatrix)
    const allDependencies = matrixItems.map(item => item.dependency)

    for (const matrixItem of matrixItems) {
        const compatibilities = matrixItem.compatibilities
        if (!isNotEmpty(compatibilities)) {
            continue
        }

        const seenCompatibilities = new Set<string>()
        removeFromArrayIf(compatibilities, compatibility => {
            const key = getCompatibilityKey(compatibility)
            if (seenCompatibilities.has(key)) {
                return true
            } else {
                seenCompatibilities.add(key)
                return false
            }
        })

        removeFromArrayIf(compatibilities, compatibility =>
            !allDependencies.some(dependency => matchDependencies(compatibility.dependency, dependency))
            || matchDependencies(compatibility.dependency, matrixItem.dependency),
        )

        if (compatibilities.length) {
            matrixItem.compatibilities = compatibilities
        } else {
            delete matrixItem.compatibilities
        }
    }
}

// TODO: test separately
export function normalizeCompatibilities(fetchedMatrix: FetchedMatrix): void {
    Object.values(fetchedMatrix).forEach(item => {
        for (const compatibility of item.compatibilities ?? []) {
            compatibility.includeVersionSuffixes ??= false
        }
    })
}

// TODO: test separately
export function copyCompatibilitiesToDependent(fetchedMatrix: FetchedMatrix) {
    const fetchedMatrixEntries = Object.entries(fetchedMatrix)
    for (const [property, matrixItem] of fetchedMatrixEntries) {
        for (const compatibility of matrixItem.compatibilities ?? []) {
            for (const [curProperty, curMatrixItem] of fetchedMatrixEntries) {
                if (property === curProperty) {
                    continue
                }

                if (!matchDependencies(compatibility.dependency, curMatrixItem.dependency)) {
                    continue
                }

                const invertedCompatibility: CompatibilityItem = {
                    versionRange: compatibility.dependencyVersionRange,
                    dependency: matrixItem.dependency,
                    dependencyVersionRange: compatibility.versionRange,
                    includeVersionSuffixes: compatibility.includeVersionSuffixes,
                }

                const invertedCompatibilityKey = getCompatibilityKey(invertedCompatibility)
                const addedCompatibilityKeys = new Set<string>(
                    curMatrixItem.compatibilities?.map(it => getCompatibilityKey(it)) ?? [],
                )
                if (addedCompatibilityKeys.has(invertedCompatibilityKey)) {
                    continue
                }

                (curMatrixItem.compatibilities ??= []).push(invertedCompatibility)
            }
        }
    }
}

function getCompatibilityKey(compatibility: CompatibilityItem): string {
    return JSON.stringify(compatibility)
}

// TODO: test separately
export function composeVersionMatrixIn(
    versionMatrix: VersionMatrixItem[],
    fetchedMatrix: FetchedMatrix,
    index: number = 0,
    currentVersionMatrixItem: VersionMatrixItem = {},
) {
    if (index === 0) {
        fetchedMatrix = toSortedByKey(
            fetchedMatrix,
            (k1, k2) => {
                const onlyOnce1 = fetchedMatrix[k1].only?.includes('once') ? 1 : 0
                const onlyOnce2 = fetchedMatrix[k2].only?.includes('once') ? 1 : 0
                return onlyOnce1 - onlyOnce2
            },
        )
    }

    const fetchedMatrixEntries = Object.entries(fetchedMatrix)
    const [property, fetchedItem] = fetchedMatrixEntries[index]

    forEachVersion: for (const version of fetchedItem.fetchedVersions) {
        for (let prevIndex = 0; prevIndex < index; prevIndex++) {
            const [prevProperty, prevFetchedItem] = fetchedMatrixEntries[prevIndex]
            // compatibilities of the prev item that are for the current item:
            const prevCompatibilities = (prevFetchedItem.compatibilities ?? [])
                .filter(prevCompatibility => matchDependencies(
                    prevCompatibility.dependency,
                    fetchedItem.dependency,
                ))
            // compatibilities of the prev item that match its version:
            const prevMatchedCompatibilities = prevCompatibilities
                .filter(prevCompatibility => matchVersionToCompatibilityRange(
                    prevFetchedItem.dependency,
                    currentVersionMatrixItem[prevProperty],
                    prevFetchedItem.versioning,
                    prevCompatibility.versionRange,
                    prevCompatibility.includeVersionSuffixes,
                ))
            // compatibilities of the prev item that match the current version:
            const matchedCompatibilities = prevMatchedCompatibilities
                .filter(prevCompatibility => matchVersionToCompatibilityRange(
                    fetchedItem.dependency,
                    version,
                    fetchedItem.versioning,
                    prevCompatibility.dependencyVersionRange,
                    prevCompatibility.includeVersionSuffixes,
                ))
            if (prevCompatibilities.length && !matchedCompatibilities.length) {
                // there are configured compatibilities, but non were matched
                continue forEachVersion
            }
        }

        currentVersionMatrixItem[property] = version

        if (index === fetchedMatrixEntries.length - 1) {
            versionMatrix.push({ ...currentVersionMatrixItem })
        } else {
            composeVersionMatrixIn(versionMatrix,
                fetchedMatrix,
                index + 1,
                currentVersionMatrixItem,
            )
        }

        delete currentVersionMatrixItem[property]

        if (fetchedItem.only?.includes('once')) {
            break forEachVersion
        }
    }
}

function matchVersionToCompatibilityRange(
    dependency: string,
    version: string,
    versioning: string | undefined,
    compatibilityVersionRange: string,
    includeVersionSuffixes: boolean | undefined,
): boolean {
    if (includeVersionSuffixes) {
        version = substringBefore(version, '-')
    }

    const versioningObj = versionings.get(versioning ?? DEFAULT_VERSIONING)
    return isInVersioningRange(versioningObj, dependency, version, compatibilityVersionRange)
}
