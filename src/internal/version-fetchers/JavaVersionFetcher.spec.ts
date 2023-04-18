import { JavaVersionFetcher } from './JavaVersionFetcher'

describe('JavaVersionFetcher', () => {

    const fetcher = new JavaVersionFetcher()

    it('supportDependencies', () => {
        expect(fetcher.supportDependencies).toEqual('optional')
    })

    it('supportedOnlyDependencies', () => {
        expect(fetcher.supportedOnlyDependencies).toEqual([
            'lts',
            'jre',
            'jre-lts',
        ])
    })

    it('supportRepositories', () => {
        expect(fetcher.supportRepositories).toEqual('no')
    })

    it('default', async () => {
        const versions = await fetcher.fetchVersions({})
        expect(versions).toContain('18.0.1+10')
        expect(versions).toContain('18.0.0+36')
        expect(versions).toContain('17.0.6+10')
        expect(versions).toContain('11.0.18+10')
    })

    it('jre', async () => {
        const versions = await fetcher.fetchVersions({ dependency: 'jre' })
        expect(versions).toContain('18.0.1+10')
        expect(versions).not.toContain('18.0.0+36')
        expect(versions).toContain('17.0.6+10')
        expect(versions).toContain('11.0.18+10')
    })

    it('default-lts', async () => {
        const versions = await fetcher.fetchVersions({ dependency: 'lts' })
        expect(versions).not.toContain('18.0.1+10')
        expect(versions).toContain('17.0.6+10')
        expect(versions).toContain('11.0.18+10')
    })

    it('jre-lts', async () => {
        const versions = await fetcher.fetchVersions({ dependency: 'jre-lts' })
        expect(versions).not.toContain('18.0.1+10')
        expect(versions).toContain('17.0.6+10')
        expect(versions).toContain('11.0.18+10')
    })

})
