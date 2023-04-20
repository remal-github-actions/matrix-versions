import { MatrixItem } from './config'
import { removeUnusedCompatibilities, reorderCompatibilities } from './matrix-functions'

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
