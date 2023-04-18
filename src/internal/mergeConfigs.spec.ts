import { Config } from './config'
import { mergeConfigs } from './mergeConfigs'
import { newEmptyConfig } from './newEmptyConfig'

describe('mergeConfigs', () => {

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
        expect(mergeConfigs(config1, config2))
            .toEqual({
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
            })
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
        expect(mergeConfigs(config1, config2))
            .toEqual({
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
            })
    })

    it('merge compatibilities', () => {
        const config1: Config = {
            compatibilities: {
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
            compatibilities: {
                dep: [
                    {
                        versionRange: '[2,3)',
                        dependency: 'other',
                        dependencyVersionRange: '[2,3)',
                    }
                ]
            }
        }
        expect(mergeConfigs(config1, config2))
            .toEqual({
                compatibilities: {
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
            })
    })

})
