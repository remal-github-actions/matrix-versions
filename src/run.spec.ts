import { run } from './run'

describe('run', () => {

    it('simple', async () => {
        const versionMatrix = await run(1000, 0, 'test', [], `

matrix:
  spring-boot:
    dependency: maven:org.springframework.boot:spring-boot-dependencies
    include:
    - '[2,)'

        `)

        const springBootVersions = versionMatrix.map(it => it['spring-boot'])
        expect(springBootVersions.includes('3.0.6')).toEqual(true)
        expect(springBootVersions.includes('2.7.11')).toEqual(true)
        expect(springBootVersions.includes('2.3.12.RELEASE')).toEqual(true)
        expect(springBootVersions.includes('1.5.22.RELEASE')).toEqual(false)
    })

})
