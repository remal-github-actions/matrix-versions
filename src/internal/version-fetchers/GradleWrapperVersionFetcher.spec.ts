import { GradleWrapperVersionFetcher } from './GradleWrapperVersionFetcher.js'

describe(GradleWrapperVersionFetcher.name, () => {

    const fetcher = new GradleWrapperVersionFetcher()

    it('defaultVersioning', () => {
        expect(fetcher.versioning).toEqual('gradle')
    })

    it('supportDependencies', () => {
        expect(fetcher.withDependencies).toEqual(false)
    })

    it('default', async () => {
        const versions = await fetcher.fetchVersions({})
        expect(versions).toContain('8.1')
        expect(versions).toContain('8.0.2')
        expect(versions).toContain('8.0.1')
        expect(versions).toContain('8.0')
        expect(versions).toContain('7.0')
    })

})
