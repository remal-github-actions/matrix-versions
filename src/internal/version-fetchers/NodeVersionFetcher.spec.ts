import { NodeVersionFetcher } from './NodeVersionFetcher'

describe(NodeVersionFetcher.name, () => {

    const fetcher = new NodeVersionFetcher()

    it('defaultVersioning', () => {
        expect(fetcher.defaultVersioning).toEqual('node')
    })

    it('supportDependencies', () => {
        expect(fetcher.withDependencies).toEqual(false)
    })

    it('default', async () => {
        const versions = await fetcher.fetchVersions({})
        expect(versions).toContain('v19.9.0')
        expect(versions).toContain('v19.8.1')
        expect(versions).toContain('v18.16.0')
        expect(versions).toContain('v17.9.1')
        expect(versions).toContain('v16.20.0')
    })

    it('lts', async () => {
        const versions = await fetcher.fetchVersions({ only: ['lts'] })
        expect(versions).not.toContain('v19.9.0')
        expect(versions).not.toContain('v19.8.1')
        expect(versions).toContain('v18.16.0')
        expect(versions).not.toContain('v17.9.1')
        expect(versions).toContain('v16.20.0')
    })

})
