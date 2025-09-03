import { MavenVersionFetcher } from './MavenVersionFetcher.js'

describe(MavenVersionFetcher.name, () => {

    const fetcher = new MavenVersionFetcher()

    it('defaultVersioning', () => {
        expect(fetcher.versioning).toEqual('maven')
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

})
