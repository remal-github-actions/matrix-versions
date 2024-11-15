import { NodeVersionFetcher } from './NodeVersionFetcher.js'

describe(NodeVersionFetcher.name, () => {

    const fetcher = new NodeVersionFetcher()

    it('defaultVersioning', () => {
        expect(fetcher.versioning).toEqual('semver-coerced')
    })

    it('supportDependencies', () => {
        expect(fetcher.withDependencies).toEqual(false)
    })

    it('default', async () => {
        const versions = await fetcher.fetchVersions({})
        expect(versions).toContain('19')
        expect(versions).toContain('18')
        expect(versions).toContain('17')
        expect(versions).toContain('16')
    })

    it('lts', async () => {
        const versions = await fetcher.fetchVersions({ only: ['lts'] })
        expect(versions).not.toContain('19')
        expect(versions).toContain('18')
        expect(versions).not.toContain('17')
        expect(versions).toContain('16')
    })

})
