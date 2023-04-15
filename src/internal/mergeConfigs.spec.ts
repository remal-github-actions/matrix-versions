import { Config } from './config'
import { mergeConfigs } from './mergeConfigs'
import { newEmptyConfig } from './newEmptyConfig'

describe('mergeConfigs', () => {

    it('empty', function() {
        expect(mergeConfigs())
            .toEqual(newEmptyConfig())
    })

    it('merge objects', function() {
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

    it('merge arrays', function() {
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

})
