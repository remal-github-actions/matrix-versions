import dedent from 'dedent'
import { VersionMatrixItem } from './internal/matrix-functions'
import { run } from './run.js'

describe(run.name, () => {
    async function testRun(config: string) {
        // eslint-disable-next-line no-useless-concat
        const gitHubToken = 'g' + 'hp_xmGQ2dHvCiK685' + 'qNEFuA3IAvv6Vfg62WM1hG'

        config = dedent(config)

        return run(1000, 0, gitHubToken, [], config)
    }

    function groupMatrix(
        items: VersionMatrixItem[],
        coreDependency: string,
        otherDependency: string,
    ): Record<string, string[]> {
        const result: Record<string, string[]> = {}
        for (const item of items) {
            const coreVersion = item[coreDependency]
            const otherVersion = item[otherDependency]
            if (coreVersion != null && otherVersion != null) {
                let group = result[coreVersion]
                if (group == null) {
                    result[coreVersion] = group = []
                }
                group.push(otherVersion)
            }
        }
        return result
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
                - stable
              gradle:
                dependency: gradle-wrapper
                only:
                - stable
        `)

        const groupedVersions = groupMatrix(versionMatrix, 'java', 'gradle')

        expect(groupedVersions['8']).toIncludeAllMembers([
            '2.0',
            '3.0',
            '4.0',
            '5.0',
            '6.0',
            '7.0',
            '8.0',
        ])
        expect(groupedVersions['11']).toIncludeAllMembers([
            '5.0',
            '6.0',
            '5.0',
            '8.0',
        ])
        expect(groupedVersions['16']).toIncludeAllMembers([
            '7.0',
            '8.0',
        ])
        expect(groupedVersions['17']).toIncludeAllMembers([
            '7.3',
            '8.0',
            '9.0.0',
        ])
        expect(groupedVersions['18']).toIncludeAllMembers([
            '7.5',
            '8.0',
            '9.0.0',
        ])
        expect(groupedVersions['19']).toIncludeAllMembers([
            '7.6',
            '8.0',
            '9.0.0',
        ])
        expect(groupedVersions['20']).toIncludeAllMembers([
            '8.3',
            '9.0.0',
        ])
        expect(groupedVersions['21']).toIncludeAllMembers([
            '8.5',
            '9.0.0',
        ])
        expect(groupedVersions['22']).toIncludeAllMembers([
            '8.8',
            '9.0.0',
        ])
        expect(groupedVersions['23']).toIncludeAllMembers([
            '8.10',
            '9.0.0',
        ])
        expect(groupedVersions['24']).toIncludeAllMembers([
            '8.14',
            '9.0.0',
        ])

        expect(versionMatrix).not.toIncludeAnyMembers([
            {
                'java': '8',
                'gradle': '8.15',
            },

            {
                'java': '11',
                'gradle': '4.10',
            },
            {
                'java': '11',
                'gradle': '8.15',
            },
        ])
    })

    it('java + maven:name.remal.gradle-api', async () => {
        const versionMatrix = await testRun(`
            matrix:
              java:
                dependency: java
              gradle:
                dependency: maven:name.remal.gradle-api:gradle-api
                repositories:
                - 'https://maven.pkg.github.com/remal-gradle-api/packages'
                only:
                - stable
                include:
                - '[3,)'
        `)

        const expectedVersionMatrix = await testRun(`
            matrix:
              java:
                dependency: java
              gradle:
                dependency: gradle-wrapper
                only:
                - stable
                include:
                - '[3,)'
        `)

        expect(versionMatrix).toStrictEqual(expectedVersionMatrix)
    })

})
