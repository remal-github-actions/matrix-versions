import { getErrorOf, NoErrorThrownError } from '../utils'
import { MavenVersionFetcher } from './MavenVersionFetcher'

describe(MavenVersionFetcher.name, () => {

    const fetcher = new MavenVersionFetcher()

    it('defaultVersioning', () => {
        expect(fetcher.defaultVersioning).toEqual('maven')
    })

    it('supportDependencies', () => {
        expect(fetcher.withDependencies).toEqual(true)
    })

    it('without repository', async () => {
        const versions = await fetcher.fetchVersions({
            dependency: 'org.springframework.boot:spring-boot-dependencies',
        })
        expect(versions).toContain('3.0.5')
        expect(versions).toContain('3.0.4')
        expect(versions).toContain('2.7.10')
        expect(versions).toContain('2.7.9')
        expect(versions).toContain('2.6.14')
        expect(versions).toContain('2.6.13')
    })

    it('with repository', async () => {
        const versions = await fetcher.fetchVersions({
            dependency: 'org.springframework.boot:spring-boot-dependencies',
            repositories: ['https://repo.spring.io/milestone'],
        })
        expect(versions).toContain('3.0.0-RC1')
        expect(versions).toContain('2.7.0-M1')
        expect(versions).toContain('2.6.0-RC1')
    })

    it('unknown dependency', async () => {
        const error = await getErrorOf(async () => fetcher.fetchVersions({
            dependency: 'unknown:unknown',
        }))
        expect(error).not.toBeInstanceOf(NoErrorThrownError)
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toMatch(/^No versions found of 'unknown:unknown' in .+$/)
    })

})
