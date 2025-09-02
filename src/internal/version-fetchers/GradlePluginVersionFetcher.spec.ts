import { getErrorOf, NoErrorThrownError } from '../utils'
import { GradlePluginVersionFetcher } from './GradlePluginVersionFetcher'

describe(GradlePluginVersionFetcher.name, () => {

    const fetcher = new GradlePluginVersionFetcher()

    it('defaultVersioning', () => {
        expect(fetcher.versioning).toEqual('maven')
    })

    it('supportDependencies', () => {
        expect(fetcher.withDependencies).toEqual(true)
    })

    it('without repository', async () => {
        const versions = await fetcher.fetchVersions({
            dependency: 'org.gradle.toolchains.foojay-resolver',
        })
        expect(versions).toContain('1.0.0')
        expect(versions).toContain('0.9.0')
    })

    it('unknown dependency', async () => {
        const error = await getErrorOf(async () => fetcher.fetchVersions({
            dependency: 'unknown',
        }))
        expect(error).not.toBeInstanceOf(NoErrorThrownError)
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toMatch(/^No versions found of 'unknown' in .+$/)
    })

})
