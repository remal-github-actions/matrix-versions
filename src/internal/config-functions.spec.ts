import { Config, VersionOnlyFilter } from './config'
import {
    mergeConfigs,
    newEmptyConfig,
    populateGlobalCompatibilities,
    processGlobalCompatibilityAliases,
    validateConfig,
} from './config-functions'
import { clone } from './utils'

describe(validateConfig.name, () => {

    it('empty', () => {
        expect(() => validateConfig({})).not.toThrow()
    })

    it('$schema field', () => {
        expect(() => validateConfig({ $schema: 'value' })).not.toThrow()
    })

    it('unknown field', () => {
        expect(() => validateConfig({ field: 'value' })).toThrow()
    })


    const onlyFilterStates: ({ only: VersionOnlyFilter[], valid: boolean })[] = [
        { only: ['lts', 'stable'], valid: true },
        { only: ['current-unstable'], valid: true },
        { only: ['lts', 'stable-majors'], valid: true },
        { only: ['lts', 'stable-majors+current-unstable'], valid: false },
        { only: ['lts', 'current-unstable'], valid: false },
        { only: ['stable', 'stable-majors'], valid: true },
        { only: ['stable', 'stable-majors+current-unstable'], valid: false },
        { only: ['stable', 'current-unstable'], valid: false },
        { only: ['stable+current-unstable', 'stable-majors'], valid: false },
        { only: ['stable+current-unstable', 'stable-majors+current-unstable'], valid: true },
        { only: ['stable+current-unstable', 'current-unstable'], valid: false },
        { only: ['stable-majors+current-unstable', 'stable-minors'], valid: false },
        { only: ['stable-majors', 'stable-minors+current-unstable'], valid: false },
        { only: ['stable-majors', 'current-unstable'], valid: false },
        { only: ['stable-majors+current-unstable', 'stable-minors'], valid: false },
        { only: ['stable-majors+current-unstable', 'stable-minors+current-unstable'], valid: false },
        { only: ['stable-majors+current-unstable', 'current-unstable'], valid: false },
    ]

    for (const { only, valid } of onlyFilterStates) {
        it(`'only' filters: ${only.join(' + ')}`, () => {
            const config: Config = {
                matrix: {
                    'name': {
                        dependency: 'maven:unknown',
                        only
                    }
                }
            }
            const assertion = expect(() => validateConfig(config))
            if (valid) {
                assertion.not.toThrow()
            } else {
                assertion.toThrow()
            }
        })
    }

})

describe(mergeConfigs.name, () => {

    it('empty', () => {
        expect(mergeConfigs())
            .toEqual(newEmptyConfig())
    })

    it('merge matrix', () => {
        const config1: Config = {
            matrix: {
                'name': {
                    dependency: 'test'
                }
            }
        }
        const config2: Config = {
            auth: [
                {
                    host: 'host',
                    token: 'token',
                }
            ]
        }
        const expected: Config = {
            matrix: {
                'name': {
                    dependency: 'test'
                }
            },
            auth: [
                {
                    host: 'host',
                    token: 'token',
                }
            ]
        }
        expect(mergeConfigs(config1, config2))
            .toEqual(expected)
    })

    it('merge auth', () => {
        const config1: Config = {
            auth: [
                {
                    host: 'host1',
                    token: 'token',
                }
            ]
        }
        const config2: Config = {
            auth: [
                {
                    host: 'host2',
                    token: 'token',
                }
            ]
        }
        const expected: Config = {
            auth: [
                {
                    host: 'host1',
                    token: 'token',
                },
                {
                    host: 'host2',
                    token: 'token',
                }
            ]
        }
        expect(mergeConfigs(config1, config2))
            .toEqual(expected)
    })

    it('merge compatibilities', () => {
        const config1: Config = {
            globalCompatibilities: {
                dep: [
                    {
                        versionRange: '[1,2)',
                        dependency: 'other',
                        dependencyVersionRange: '[1,2)',
                    }
                ]
            }
        }
        const config2: Config = {
            globalCompatibilities: {
                dep: [
                    {
                        versionRange: '[2,3)',
                        dependency: 'other',
                        dependencyVersionRange: '[2,3)',
                    }
                ]
            }
        }
        const expected: Config = {
            globalCompatibilities: {
                dep: [
                    {
                        versionRange: '[1,2)',
                        dependency: 'other',
                        dependencyVersionRange: '[1,2)',
                    },
                    {
                        versionRange: '[2,3)',
                        dependency: 'other',
                        dependencyVersionRange: '[2,3)',
                    }
                ]
            }
        }
        expect(mergeConfigs(config1, config2))
            .toEqual(expected)
    })

})

describe(processGlobalCompatibilityAliases.name, () => {

    it('simple', () => {
        const config: Config = {
            globalCompatibilities: {
                '1': [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                ],
            },
            globalCompatibilityAliases: {
                '3': '1',
            },
        }
        const expectedConfig: Config = {
            globalCompatibilities: {
                '1': clone(config.globalCompatibilities!!['1']),
                '3': clone(config.globalCompatibilities!!['1']),
            },
        }
        processGlobalCompatibilityAliases(config)
        expect(config).toEqual(expectedConfig)
    })

    it('not found alias', () => {
        const config: Config = {
            globalCompatibilityAliases: {
                '3': '1',
            },
        }
        expect(() => processGlobalCompatibilityAliases(config)).toThrow()
    })

    it('alias for defined compatibilities', () => {
        const config: Config = {
            globalCompatibilities: {
                '1': [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                ],
                '3': [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                ],
            },
            globalCompatibilityAliases: {
                '3': '1',
            },
        }
        expect(() => processGlobalCompatibilityAliases(config)).toThrow()
    })

})

describe(populateGlobalCompatibilities.name, () => {

    it('simple', () => {
        const config: Config = {
            matrix: {
                'prop1': {
                    dependency: '1',
                },
            },
            globalCompatibilities: {
                '1': [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                ],
            },
        }
        const expectedConfig: Config = {
            matrix: {
                'prop1': {
                    dependency: '1',
                    compatibilities: clone(config.globalCompatibilities!!['1']),
                },
            },
        }
        populateGlobalCompatibilities(config)
        expect(config).toEqual(expectedConfig)
    })

    it('not present in matrix', () => {
        const config: Config = {
            matrix: {
                'prop2': {
                    dependency: '2',
                },
            },
            globalCompatibilities: {
                '1': [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                ],
            },
        }
        const expectedConfig: Config = {
            matrix: {
                'prop2': {
                    dependency: '2',
                },
            },
        }
        populateGlobalCompatibilities(config)
        expect(config).toEqual(expectedConfig)
    })

    it('withoutGlobalCompatibilities', () => {
        const config: Config = {
            matrix: {
                'prop1': {
                    dependency: '1',
                    withoutGlobalCompatibilities: true,
                },
            },
            globalCompatibilities: {
                '1': [
                    {
                        versionRange: '1',
                        dependency: '2',
                        dependencyVersionRange: '2',
                    },
                ],
            },
        }
        const expectedConfig: Config = {
            matrix: clone(config.matrix),
        }
        populateGlobalCompatibilities(config)
        expect(config).toEqual(expectedConfig)
    })

})
