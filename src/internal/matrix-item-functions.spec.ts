import {
    FetchedMatrixItem,
    filterFetchedVersions,
    ParsedDependency,
    parseMatrixItemDependency,
} from './matrix-item-functions'
import { shuffleArray } from './utils'

describe(filterFetchedVersions.name, () => {

    it('include+exclude', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'semver',
            fetchedVersions: [
                'asd',
                '1.0.0',
                '1.1.0',
                '2.0.0',
                '2.1.0',
                '3.0.0',
                '3.1.0',
                '4.0.0',
                '4.1.0',
                '5.0.0',
                '5.1.0',
            ],
            include: [
                '/[a-z]/',
                '/\\.0\\b/',
                '<= 3',
                '<= 4',
            ],
            exclude: [
                '/\\.1\\b/',
                '<= 1',
                '<= 2',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                '4.0.0',
                '3.0.0',
            ])
    })

    it('only: stable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                '2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                '2',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ])
    })

    it('only: stable+current-unstable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                '2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable+current-unstable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                '2.1-rc',
                '2',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ])
    })

    it('only: stable+current-unstable: no current unstable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                //'2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable+current-unstable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                //'2.1-rc',
                '2',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ])
    })

    it('only: stable-majors', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                '2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable-majors',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                '2',
                '1.2.1',
                '0.1.1+2',
            ])
    })

    it('only: stable-majors+current-unstable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                '2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable-majors+current-unstable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                '2.1-rc',
                '2',
                '1.2.1',
                '0.1.1+2',
            ])
    })

    it('only: stable-majors+current-unstable: no current unstable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                //'2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable-majors+current-unstable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                //'2.1-rc',
                '2',
                '1.2.1',
                '0.1.1+2',
            ])
    })

    it('only: stable-minors', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                '2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable-minors',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                '2',
                '1.2.1',
                '1.1',
                '1',
                '0.1.1+2',
            ])
    })

    it('only: stable-minors+current-unstable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                '2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable-minors+current-unstable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                '2.1-rc',
                '2',
                '1.2.1',
                '1.1',
                '1',
                '0.1.1+2',
            ])
    })

    it('only: stable-minors+current-unstable: no current unstable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                //'2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable-minors+current-unstable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                //'2.1-rc',
                '2',
                '1.2.1',
                '1.1',
                '1',
                '0.1.1+2',
            ])
    })

    it('only: stable-patches', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                '2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable-patches',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                '2',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
            ])
    })

    it('only: stable-patches+current-unstable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                '2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable-patches+current-unstable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                '2.1-rc',
                '2',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
            ])
    })

    it('only: stable-patches+current-unstable: no current unstable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                //'2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'stable-patches+current-unstable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                //'2.1-rc',
                '2',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
            ])
    })

    it('only: current-unstable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                '2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'current-unstable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                '2.1-rc',
            ])
    })

    it('only: current-unstable: no current unstable', () => {
        const fetchedMatrixItem: FetchedMatrixItem = {
            dependency: 'test:test',
            versioning: 'maven',
            fetchedVersions: shuffleArray([
                // '2.1-rc',
                '2',
                '2-rc',
                '1.2.1',
                '1.2',
                '1.1',
                '1',
                '0.1.1+2',
                '0.1.1+1',
            ]),
            only: [
                'current-unstable',
            ],
        }
        filterFetchedVersions(fetchedMatrixItem)
        expect(fetchedMatrixItem.fetchedVersions)
            .toEqual([
                //'2.1-rc',
            ])
    })

})

describe(parseMatrixItemDependency.name, () => {

    it(`full`, () => {
        const matrixItemDependency = 'fetcher:id'
        const expected: ParsedDependency = {
            fetcherId: 'fetcher',
            dependency: 'id',
        }
        expect(parseMatrixItemDependency(matrixItemDependency))
            .toEqual(expected)
    })

    it(`fetcherId only`, () => {
        const matrixItemDependency = 'fetcher'
        const expected: ParsedDependency = {
            fetcherId: 'fetcher',
            dependency: '',
        }
        expect(parseMatrixItemDependency(matrixItemDependency))
            .toEqual(expected)
    })

})
