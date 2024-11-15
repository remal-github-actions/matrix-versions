import { JavaFullVersionFetcher } from './JavaFullVersionFetcher.js'

describe(JavaFullVersionFetcher.name, () => {

    const fetcher = new JavaFullVersionFetcher()

    it('defaultVersioning', () => {
        expect(fetcher.versioning).toEqual('maven')
    })

    it('supportDependencies', () => {
        expect(fetcher.withDependencies).toEqual(false)
    })

    it('default', async () => {
        const versions = await fetcher.fetchVersions({})
        expect(versions).toContain('18.0.1+10')
        expect(versions).toContain('18.0.0+36')
        expect(versions).toContain('17.0.6+10')
        expect(versions).toContain('11.0.18+10')
    })

    it('lts', async () => {
        const versions = await fetcher.fetchVersions({ only: ['lts'] })
        expect(versions).not.toContain('18.0.1+10')
        expect(versions).toContain('17.0.6+10')
        expect(versions).toContain('11.0.18+10')
    })

})
