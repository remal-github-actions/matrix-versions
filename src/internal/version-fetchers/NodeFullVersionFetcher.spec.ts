import { NodeFullVersionFetcher } from './NodeFullVersionFetcher'

describe(NodeFullVersionFetcher.name, () => {

    const fetcher = new NodeFullVersionFetcher()

    it('defaultVersioning', () => {
        expect(fetcher.defaultVersioning).toEqual('semver-coerced')
    })

    it('supportDependencies', () => {
        expect(fetcher.withDependencies).toEqual(false)
    })

    it('default', async () => {
        const versions = await fetcher.fetchVersions({})
        expect(versions).toContain('19.9.0')
        expect(versions).toContain('19.8.1')
        expect(versions).toContain('18.16.0')
        expect(versions).toContain('17.9.1')
        expect(versions).toContain('16.20.0')
    })

    it('lts', async () => {
        const versions = await fetcher.fetchVersions({ only: ['lts'] })
        expect(versions).not.toContain('19.9.0')
        expect(versions).not.toContain('19.8.1')
        expect(versions).toContain('18.16.0')
        expect(versions).not.toContain('17.9.1')
        expect(versions).toContain('16.20.0')
    })

})
