import { composeVersionMatrix, removeUnusedCompatibilities, VersionMatrixItem } from './matrix-functions.js'
import { FetchedMatrix } from './matrix-item-functions.js'

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
        const versionMatrix = composeVersionMatrix(fetchedMatrix)
        expect(versionMatrix).toEqual(expectedVersionMatrix)
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
        const versionMatrix = composeVersionMatrix(fetchedMatrix)
        expect(versionMatrix).toEqual(expectedVersionMatrix)
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
        const versionMatrix = composeVersionMatrix(fetchedMatrix)
        expect(versionMatrix).toEqual(expectedVersionMatrix)
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
        const versionMatrix = composeVersionMatrix(fetchedMatrix)
        expect(versionMatrix).toEqual(expectedVersionMatrix)
    })

})

describe(removeUnusedCompatibilities.name, () => {

    it('remove self', () => {
        const fetchedMatrix: FetchedMatrix = {
            prop1: {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: '1',
                        dependencyVersionRange: '1',
                    },
                ],
                fetchedVersions: [],
            },
        }
        const expectedFetchedMatrix = { ...fetchedMatrix }
        removeUnusedCompatibilities(fetchedMatrix)
        expect(fetchedMatrix).toEqual(expectedFetchedMatrix)
    })

    it('remove unused', () => {
        const fetchedMatrix: FetchedMatrix = {
            prop1: {
                dependency: '1',
                compatibilities: [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                ],
                fetchedVersions: [],
            },
        }
        const expectedFetchedMatrix = { ...fetchedMatrix }
        removeUnusedCompatibilities(fetchedMatrix)
        expect(fetchedMatrix).toEqual(expectedFetchedMatrix)
    })

})
