import { GradleWrapperVersionFetcher } from './GradleWrapperVersionFetcher'

describe('GradleWrapperVersionFetcher', () => {

    const fetcher = new GradleWrapperVersionFetcher()

    it('supportDependencies', () => {
        expect(fetcher.supportDependencies).toEqual('no')
    })

    it('supportedOnlyDependencies', () => {
        expect(fetcher.supportedOnlyDependencies).toEqual([])
    })

    it('supportRepositories', () => {
        expect(fetcher.supportRepositories).toEqual('no')
    })

    it('without repository', async () => {
        const versions = await fetcher.fetchVersions({})
        expect(versions).toContain('8.1')
        expect(versions).toContain('8.0.2')
        expect(versions).toContain('8.0.1')
        expect(versions).toContain('8.0')
        expect(versions).toContain('7.0')
    })

    it('with repository', async () => {
        const versions = await fetcher.fetchVersions({
            repository: 'https://services.gradle.org/versions/all',
        })
        expect(versions).toContain('8.1')
        expect(versions).toContain('8.0.2')
        expect(versions).toContain('8.0.1')
        expect(versions).toContain('8.0')
        expect(versions).toContain('7.0')
    })

})
