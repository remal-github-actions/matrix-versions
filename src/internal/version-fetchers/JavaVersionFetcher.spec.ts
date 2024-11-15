import { JavaVersionFetcher } from './JavaVersionFetcher.js'

describe(JavaVersionFetcher.name, () => {

    const fetcher = new JavaVersionFetcher()

    it('defaultVersioning', () => {
        expect(fetcher.versioning).toEqual('maven')
    })

    it('supportDependencies', () => {
        expect(fetcher.withDependencies).toEqual(false)
    })

    it('default', async () => {
        const versions = await fetcher.fetchVersions({})
        expect(versions).toContain('18')
        expect(versions).toContain('17')
        expect(versions).toContain('11')
    })

    it('lts', async () => {
        const versions = await fetcher.fetchVersions({ only: ['lts'] })
        expect(versions).toContain('21')
        expect(versions).not.toContain('18')
        expect(versions).toContain('17')
        expect(versions).toContain('11')
    })

    it('lts + stable', async () => {
        const versions = await fetcher.fetchVersions({ only: ['lts', 'stable'] })
        expect(versions).toContain('21')
        expect(versions).not.toContain('18')
        expect(versions).toContain('17')
        expect(versions).toContain('11')
    })

})
