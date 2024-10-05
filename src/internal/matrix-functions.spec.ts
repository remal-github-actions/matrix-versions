import { MatrixItem } from './config.js'
import {
    composeVersionMatrix,
    processFullCompatibilities,
    removeUnusedCompatibilities,
    reorderCompatibilities,
    VersionMatrixItem,
} from './matrix-functions.js'
import { FetchedMatrix } from './matrix-item-functions.js'
import { fullSupportedVersionFetcherSuffix } from './version-fetcher-api.js'

describe(composeVersionMatrix.name, () => {

    it(`one`, () => {
        const fetchedMatrix: FetchedMatrix = {
            prop1: {
                dependency: '1',
                fetchedVersions: [
                    '1.1',
                    '1.2',
                ],
            },
        }
        const expectedVersionMatrix: VersionMatrixItem[] = [
            {
                prop1: '1.1',
            },
            {
                prop1: '1.2',
            },
        ]
        expect(composeVersionMatrix(fetchedMatrix))
            .toEqual(expectedVersionMatrix)
    })

    it(`two`, () => {
        const fetchedMatrix: FetchedMatrix = {
            prop1: {
                dependency: '1',
                fetchedVersions: [
                    '1.1',
                    '1.2',
                ],
            },
            prop2: {
                dependency: '2',
                fetchedVersions: [
                    '2.1',
                    '2.2',
                ],
            },
        }
        const expectedVersionMatrix: VersionMatrixItem[] = [
            {
                prop1: '1.1',
                prop2: '2.1',
            },
            {
                prop1: '1.1',
                prop2: '2.2',
            },
            {
                prop1: '1.2',
                prop2: '2.1',
            },
            {
                prop1: '1.2',
                prop2: '2.2',
            },
        ]
        expect(composeVersionMatrix(fetchedMatrix))
            .toEqual(expectedVersionMatrix)
    })

    it(`compatibility - partial`, () => {
        const fetchedMatrix: FetchedMatrix = {
            prop1: {
                dependency: '1',
                fetchedVersions: [
                    '1.1',
                    '1.2',
                ],
                compatibilities: [
                    {
                        versionRange: '>=1.2',
                        dependency: '2',
                        dependencyVersionRange: '>=2.2',
                    },
                ],
            },
            prop2: {
                dependency: '2',
                fetchedVersions: [
                    '2.1',
                    '2.2',
                    '2.3',
                ],
            },
        }
        const expectedVersionMatrix: VersionMatrixItem[] = [
            {
                prop1: '1.2',
                prop2: '2.2',
            },
            {
                prop1: '1.2',
                prop2: '2.3',
            },
        ]
        expect(composeVersionMatrix(fetchedMatrix))
            .toEqual(expectedVersionMatrix)
    })

    it(`compatibility - full`, () => {
        const fetchedMatrix: FetchedMatrix = {
            prop1: {
                dependency: '1',
                fetchedVersions: [
                    '1.1',
                    '1.2',
                ],
                compatibilities: [
                    {
                        versionRange: '<=1.1',
                        dependency: '2',
                        dependencyVersionRange: '<=2.1',
                    },
                ],
            },
            prop2: {
                dependency: '2',
                fetchedVersions: [
                    '2.1',
                    '2.2',
                ],
                compatibilities: [
                    {
                        versionRange: '>=2.2',
                        dependency: '1',
                        dependencyVersionRange: '>=1.2',
                    },
                ],
            },
        }
        const expectedVersionMatrix: VersionMatrixItem[] = [
            {
                prop1: '1.1',
                prop2: '2.1',
            },
            {
                prop1: '1.2',
                prop2: '2.2',
            },
        ]
        expect(composeVersionMatrix(fetchedMatrix))
            .toEqual(expectedVersionMatrix)
    })

})

describe(processFullCompatibilities.name, () => {

    it('java', () => {
        const matrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: 'java',
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        const expectedMatrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: 'java',
                        dependencyVersionRange: '1',
                    },
                    {
                        versionRange: '1',
                        dependency: 'java' + fullSupportedVersionFetcherSuffix,
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        processFullCompatibilities(matrixItems)
        expect(matrixItems).toEqual(expectedMatrixItems)
    })

    it('node', () => {
        const matrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: 'node',
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        const expectedMatrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: 'node',
                        dependencyVersionRange: '1',
                    },
                    {
                        versionRange: '1',
                        dependency: 'node' + fullSupportedVersionFetcherSuffix,
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        processFullCompatibilities(matrixItems)
        expect(matrixItems).toEqual(expectedMatrixItems)
    })

    it('other', () => {
        const matrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: 'other',
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        const expectedMatrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: 'other',
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        processFullCompatibilities(matrixItems)
        expect(matrixItems).toEqual(expectedMatrixItems)
    })

    it('java-full', () => {
        const matrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: 'java' + fullSupportedVersionFetcherSuffix,
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        const expectedMatrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: 'java' + fullSupportedVersionFetcherSuffix,
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        processFullCompatibilities(matrixItems)
        expect(matrixItems).toEqual(expectedMatrixItems)
    })

})

describe(removeUnusedCompatibilities.name, () => {

    it('remove self', () => {
        const matrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: '1',
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        const expectedMatrixItems: MatrixItem[] = [
            {
                dependency: '1',
            },
        ]
        removeUnusedCompatibilities(matrixItems)
        expect(matrixItems).toEqual(expectedMatrixItems)
    })

    it('remove unused', () => {
        const matrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                ],
            },
        ]
        const expectedMatrixItems: MatrixItem[] = [
            {
                dependency: '1',
            },
        ]
        removeUnusedCompatibilities(matrixItems)
        expect(matrixItems).toEqual(expectedMatrixItems)
    })

})

describe(reorderCompatibilities.name, () => {

    it('first on second', () => {
        const matrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                ],
            },
            {
                dependency: '2',
            },
        ]
        const expectedMatrixItems: MatrixItem[] = [
            ...matrixItems,
        ]
        reorderCompatibilities(matrixItems)
        expect(matrixItems).toEqual(expectedMatrixItems)
    })

    it('second on first', () => {
        const matrixItems: MatrixItem[] = [
            {
                dependency: '1',
            },
            {
                dependency: '2',
                compatibilities: [
                    {
                        versionRange: '2',
                        dependency: '1',
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        const expectedMatrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                ],
            },
            {
                dependency: '2',
            },
        ]
        reorderCompatibilities(matrixItems)
        expect(matrixItems).toEqual(expectedMatrixItems)
    })

    it('third on second and first, second on first', () => {
        const matrixItems: MatrixItem[] = [
            {
                dependency: '1',
            },
            {
                dependency: '2',
                compatibilities: [
                    {
                        versionRange: '2',
                        dependency: '1',
                        dependencyVersionRange: '1',
                    },
                ],
            },
            {
                dependency: '3',
                compatibilities: [
                    {
                        versionRange: '3',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                    {
                        versionRange: '3',
                        dependency: '1',
                        dependencyVersionRange: '1',
                    },
                ],
            },
        ]
        const expectedMatrixItems: MatrixItem[] = [
            {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                    {
                        versionRange: '1',
                        dependency: '3',
                        dependencyVersionRange: '3',
                    },
                ],
            },
            {
                dependency: '2',
                compatibilities: [
                    {
                        versionRange: '2',
                        dependency: '3',
                        dependencyVersionRange: '3',
                    },
                ],
            },
            {
                dependency: '3',
            },
        ]
        reorderCompatibilities(matrixItems)
        expect(matrixItems).toEqual(expectedMatrixItems)
    })

})
