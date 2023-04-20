import * as versionings from 'renovate/dist/modules/versioning'
import { MatrixItem } from './config'
import { FetchedMatrix, FetchedMatrixItem } from './matrix-item-functions'
import { isNotEmpty, removeFromArrayIf } from './utils'

export type VersionMatrixItem = Record<string, string>
export type VersionMatrix = VersionMatrixItem[]

export function composeVersionMatrix(fetchedMatrix: FetchedMatrix): VersionMatrix {
    removeUnusedCompatibilities(Object.values(fetchedMatrix))
    reorderCompatibilities(Object.values(fetchedMatrix))

    const versionMatrix: VersionMatrix = []
    composeVersionMatrixIn(versionMatrix, {}, [], Object.keys(fetchedMatrix), Object.values(fetchedMatrix), 0)
    return versionMatrix
}

type VersionMatrixCompatibility = Record<string, string[]>
type VersionMatrixCompatibilities = VersionMatrixCompatibility[]

function composeVersionMatrixIn(
    matrix: VersionMatrix,
    matrixItem: VersionMatrixItem,
    matrixItemCompatibilities: VersionMatrixCompatibilities,
    matrixProperties: string[],
    fetchedItems: FetchedMatrixItem[],
    index: number,
): void {
    const matrixProperty = matrixProperties[index]
    const fetchedItem = fetchedItems[index]

    const versioning = versionings.get(fetchedItem.versioning)
    eachFetchedVersion: for (const fetchedVersion of fetchedItem.fetchedVersions) {
        for (const compatibility of matrixItemCompatibilities) {
            const compatibilityRanges = compatibility[fetchedItem.dependency]
            if (compatibilityRanges == null) continue
            const isCompatible = compatibilityRanges
                .some(range => versioning.getSatisfyingVersion([fetchedVersion], range))
            if (!isCompatible) {
                continue eachFetchedVersion
            }
        }


        matrixItem[matrixProperty] = fetchedVersion


        const matrixCompatibility: VersionMatrixCompatibility = {}
        fetchedItem.compatibilities
            ?.filter(compatibility => versioning.getSatisfyingVersion([fetchedVersion], compatibility.versionRange))
            ?.forEach(compatibility => {
                const dependency = compatibility.dependency
                const matrixCompatibilityValue = matrixCompatibility[dependency] = matrixCompatibility[dependency]
                    ?? []
                matrixCompatibilityValue.push(compatibility.dependencyVersionRange)
            })
        matrixItemCompatibilities.push(matrixCompatibility)


        if (index >= fetchedItems.length - 1) { // last matrix item
            matrix.push(matrixItem)
        } else {
            composeVersionMatrixIn(
                matrix,
                matrixItem,
                matrixItemCompatibilities,
                matrixProperties,
                fetchedItems,
                index + 1,
            )
        }


        matrixItemCompatibilities.pop()
    }
}

export function removeUnusedCompatibilities(matrixItems: MatrixItem[]): void {
    const allDependencies = matrixItems.map(item => item.dependency)

    for (const matrixItem of matrixItems) {
        const compatibilities = matrixItem.compatibilities
        if (!isNotEmpty(compatibilities)) continue

        removeFromArrayIf(compatibilities, compatibility =>
            !allDependencies.includes(compatibility.dependency)
            || compatibility.dependency === matrixItem.dependency,
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
            if (!isNotEmpty(secondCompatibilities)) continue

            for (let compatibilityIndex = 0; compatibilityIndex < secondCompatibilities.length; ++compatibilityIndex) {
                const secondCompatibility = secondCompatibilities[compatibilityIndex]
                if (secondCompatibility.dependency !== firstItem.dependency) continue

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
