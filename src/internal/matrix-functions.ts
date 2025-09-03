import * as core from '@actions/core'
import * as versionings from 'renovate/dist/modules/versioning'
import { actionDebug } from './actionDebug.js'
import { CompatibilityItem, MatrixItem } from './config.js'
import { DEFAULT_VERSIONING } from './constants.js'
import {
    FetchedMatrix,
    FetchedMatrixItem,
    isFullFetcherDependency,
    matchDependencies,
    withFullFetcherSuffixDependency,
    withoutFullFetcherSuffixDependency,
} from './matrix-item-functions.js'
import { isNotEmpty, onlyUnique, removeFromArrayIf } from './utils.js'
import { INCOMPATIBLE_RANGE, isInVersioningRange } from './version-utils.js'

export type VersionMatrixItem = Record<string, string>

type VersionMatrixCompatibility = Record<string, string[]>
type VersionMatrixCompatibilities = VersionMatrixCompatibility[]
type DependencyCompatibilities = Record<string, CompatibilityItem[]>

export function composeVersionMatrix(fetchedMatrix: FetchedMatrix): VersionMatrixItem[] {
    processFullCompatibilities(Object.values(fetchedMatrix))
    removeUnusedCompatibilities(Object.values(fetchedMatrix))
    reorderCompatibilities(Object.values(fetchedMatrix))

    const versionMatrix: VersionMatrixItem[] = []
    composeVersionMatrixIn(versionMatrix, {}, [], Object.keys(fetchedMatrix), Object.values(fetchedMatrix), 0)

    applyOnlyOnce(fetchedMatrix, versionMatrix)

    return versionMatrix
}

function groupCompatibilitiesByDependency(compatibilities?: CompatibilityItem[]): DependencyCompatibilities {
    if (compatibilities == null) {
        return {}
    }

    const result: DependencyCompatibilities = {}
    for (const compatibility of compatibilities) {
        const dependency = compatibility.dependency
        const resultValue = (result[dependency] = result[dependency] ?? [])
        resultValue.push(compatibility)
    }
    return result
}

export function processFullCompatibilities(matrixItems: MatrixItem[]): void {
    for (const matrixItem of matrixItems) {
        const compatibilities = matrixItem.compatibilities
        if (!isNotEmpty(compatibilities)) {
            continue
        }

        const usedFullCompatibilities = new Set<string>()
        compatibilities
            .map(it => it.dependency)
            .filter(isFullFetcherDependency)
            .filter(onlyUnique)
            .forEach(fullDependency => {
                usedFullCompatibilities.add(fullDependency)
                core.warning(
                    `Dependency '${matrixItem.dependency}' has '${fullDependency}' compatibility dependency, which is likely a mistake.`
                    + ` Consider using '${withoutFullFetcherSuffixDependency(fullDependency)}' compatibility dependency.`,
                )
            })

        ;[...compatibilities].forEach(compatibility => {
            const fullDependency = withFullFetcherSuffixDependency(compatibility.dependency)
            if (fullDependency == null || usedFullCompatibilities.has(fullDependency)) {
                return
            }
            compatibilities.push({
                versionRange: compatibility.versionRange,
                dependency: fullDependency,
                dependencyVersionRange: compatibility.dependencyVersionRange,
            })
        })
    }
}

export function removeUnusedCompatibilities(matrixItems: MatrixItem[]): void {
    const allDependencies = matrixItems.map(item => item.dependency)

    for (const matrixItem of matrixItems) {
        const compatibilities = matrixItem.compatibilities
        if (!isNotEmpty(compatibilities)) {
            continue
        }

        removeFromArrayIf(compatibilities, compatibility =>
            !allDependencies.some(dependency => matchDependencies(compatibility.dependency, dependency))
            || matchDependencies(compatibility.dependency, matrixItem.dependency),
        )

        if (!isNotEmpty(matrixItem.compatibilities)) {
            delete matrixItem.compatibilities
        }
    }
}

export function reorderCompatibilities(matrixItems: MatrixItem[]): void {
    for (let firstIndex = 0; firstIndex < matrixItems.length - 1; ++firstIndex) {
        const firstItem = matrixItems[firstIndex]
        for (let secondIndex = firstIndex + 1; secondIndex < matrixItems.length; ++secondIndex) {
            const secondItem = matrixItems[secondIndex]
            const secondCompatibilities = secondItem.compatibilities
            if (!isNotEmpty(secondCompatibilities)) {
                continue
            }

            for (let compatibilityIndex = 0; compatibilityIndex < secondCompatibilities.length; ++compatibilityIndex) {
                const secondCompatibility = secondCompatibilities[compatibilityIndex]
                if (!matchDependencies(secondCompatibility.dependency, firstItem.dependency)) {
                    continue
                }

                const firstCompatibilities = firstItem.compatibilities = firstItem.compatibilities ?? []
                firstCompatibilities.push({
                    versionRange: secondCompatibility.dependencyVersionRange,
                    dependency: secondItem.dependency,
                    dependencyVersionRange: secondCompatibility.versionRange,
                })

                secondCompatibilities.splice(compatibilityIndex, 1)
                --compatibilityIndex
            }

            if (!isNotEmpty(secondItem.compatibilities)) {
                delete secondItem.compatibilities
            }
        }
    }
}


function composeVersionMatrixIn(
    matrix: VersionMatrixItem[],
    matrixItem: VersionMatrixItem,
    matrixItemCompatibilities: VersionMatrixCompatibilities,
    matrixProperties: string[],
    fetchedItems: FetchedMatrixItem[],
    index: number,
): void {
    const matrixProperty = matrixProperties[index]
    const fetchedItem = fetchedItems[index]

    actionDebug(`${' '.repeat(index)}Composing version matrix row for '${matrixProperty}' property ('${fetchedItem.dependency}' dependency)`)

    const versioning = versionings.get(fetchedItem.versioning ?? DEFAULT_VERSIONING)
    const compatibleFetchVersions = fetchedItem.fetchedVersions.filter(version => {
        for (const compatibility of matrixItemCompatibilities) {
            for (const [compatibilityDependency, compatibilityRanges] of Object.entries(compatibility)) {
                if (!isNotEmpty(compatibilityRanges)) {
                    continue
                }
                if (matchDependencies(compatibilityDependency, fetchedItem.dependency)) {
                    const isCompatible = compatibilityRanges
                        .some(range => isInVersioningRange(versioning, fetchedItem.dependency, version, range))
                    if (!isCompatible) {
                        actionDebug(`${' '.repeat(index)}... filtering-out incompatible version: ${version}`)
                        return false
                    }
                }
            }
        }

        return true
    })

    for (const fetchedVersion of compatibleFetchVersions) {
        actionDebug(`${' '.repeat(index)}... including version: ${fetchedVersion}`)

        const fetchedVersionMatrixItem = { ...matrixItem }
        fetchedVersionMatrixItem[matrixProperty] = fetchedVersion


        if (index >= fetchedItems.length - 1) { // last matrix item
            matrix.push(fetchedVersionMatrixItem)

        } else {
            const matrixCompatibility: VersionMatrixCompatibility = {}
            const dependencyCompatibilities = groupCompatibilitiesByDependency(fetchedItem.compatibilities)
            for (const [dependency, compatibilities] of Object.entries(dependencyCompatibilities)) {
                const activeCompatibilities = compatibilities
                    .filter(compatibility => isInVersioningRange(
                        versioning,
                        fetchedItem.dependency,
                        fetchedVersion,
                        compatibility.versionRange,
                    ))
                if (activeCompatibilities.length) {
                    activeCompatibilities.forEach(compatibility => {
                        const matrixCompatibilityValue = matrixCompatibility[dependency] = matrixCompatibility[dependency]
                            ?? []
                        matrixCompatibilityValue.push(compatibility.dependencyVersionRange)
                    })
                } else {
                    matrixCompatibility[dependency] = [INCOMPATIBLE_RANGE]
                }
            }
            matrixItemCompatibilities.push(matrixCompatibility)

            composeVersionMatrixIn(
                matrix,
                fetchedVersionMatrixItem,
                matrixItemCompatibilities,
                matrixProperties,
                fetchedItems,
                index + 1,
            )

            matrixItemCompatibilities.pop()
        }
    }
}


function applyOnlyOnce(fetchedMatrix: FetchedMatrix, versionMatrix: VersionMatrixItem[]) {
    const onlyOnceProperties = Object.entries(fetchedMatrix)
        .filter(([_, matrixItem]) => matrixItem.only?.includes('once'))
        .map(([property, _]) => property)

    const seenNotOnlyOnce = new Set<string>()
    for (let index = 0; index < versionMatrix.length; index++) {
        const item = versionMatrix[index]
        const notOnlyOnce = JSON.stringify(Object.fromEntries(
            Object.entries(item)
                .filter(([property, _]) => !onlyOnceProperties.includes(property)),
        ))
        if (seenNotOnlyOnce.has(notOnlyOnce)) {
            versionMatrix.splice(index, 1)
            index--

        } else {
            seenNotOnlyOnce.add(notOnlyOnce)
        }
    }
}
