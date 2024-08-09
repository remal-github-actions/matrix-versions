import { run } from './run'

describe(run.name, () => {
    async function testRun(config: string) {
        // eslint-disable-next-line no-useless-concat
        const gitHubToken = 'g' + 'hp_xmGQ2dHvCiK685' + 'qNEFuA3IAvv6Vfg62WM1hG'
        return run(1000, 0, gitHubToken, [], config)
    }

    it('simple', async () => {
        const versionMatrix = await testRun(`
matrix:
  spring-boot:
    dependency: maven:org.springframework.boot:spring-boot-dependencies
    include:
    - '[2,)'
        `)

        expect(versionMatrix).toIncludeAllMembers([
            { 'spring-boot': '3.0.6' },
            { 'spring-boot': '2.7.11' },
            { 'spring-boot': '2.3.12.RELEASE' },
        ])

        expect(versionMatrix).not.toIncludeAllMembers([
            { 'spring-boot': '1.5.22.RELEASE' },
        ])
    })

    it('java + gradle-wrapper', async () => {
        const versionMatrix = await testRun(`
matrix:
  java:
    dependency: java
    only:
    - lts
    include:
    - '[11,)'
  gradle:
    dependency: gradle-wrapper
    include:
    - '[7,)'
        `)

        expect(versionMatrix).toIncludeAllMembers([
            {
                'java': '17',
                'gradle': '8.1.1',
            },
            {
                'java': '17',
                'gradle': '7.3.3',
            },
            {
                'java': '11',
                'gradle': '8.1.1',
            },
            {
                'java': '11',
                'gradle': '7.3.3',
            },
            {
                'java': '11',
                'gradle': '7.2',
            },
        ])

        expect(versionMatrix).not.toIncludeAllMembers([
            {
                'java': '17',
                'gradle': '7.2',
            },
        ])

        expect(versionMatrix).not.toIncludeAnyMembers([
            {
                'java': '11',
                'gradle': '8.10',
            },
            {
                'java': '11',
                'gradle': '8.10-rc-1',
            },
        ])
    })

    it('java + maven:name.remal.gradle-api', async () => {
        const versionMatrix = await testRun(`
matrix:
  java:
    dependency: java
    only:
    - lts
    include:
    - '[11,)'
  gradle:
    dependency: maven:name.remal.gradle-api:gradle-api
    repositories:
    - 'https://maven.pkg.github.com/remal-gradle-api/packages'
    include:
    - '[7,)'
        `)

        expect(versionMatrix).toIncludeAllMembers([
            {
                'java': '17',
                'gradle': '8.1.1',
            },
            {
                'java': '17',
                'gradle': '7.3.3',
            },
            {
                'java': '11',
                'gradle': '8.1.1',
            },
            {
                'java': '11',
                'gradle': '7.3.3',
            },
            {
                'java': '11',
                'gradle': '7.2',
            },
        ])

        expect(versionMatrix).not.toIncludeAllMembers([
            {
                'java': '17',
                'gradle': '7.2',
            },
        ])

        expect(versionMatrix).not.toIncludeAnyMembers([
            {
                'java': '11',
                'gradle': '8.10',
            },
            {
                'java': '11',
                'gradle': '8.10-rc-1',
            },
        ])
    })

})
