process.env.RENOVATE_X_IGNORE_RE2 = 'true'
require('./src/internal/initRenovateLogging').initRenovateLogging()


import is from '@sindresorhus/is'
import * as fs from 'fs'
import { getVersionings } from 'renovate/dist/modules/versioning'
import { isVersioningApiConstructor } from 'renovate/dist/modules/versioning/common'
import { isNotEmpty } from './src/internal/utils'
import { supportedVersionFetchers } from './src/internal/version-fetcher-api'


const supportedDependencyTypes = Array.from(supportedVersionFetchers.keys()).sort()
if (!supportedDependencyTypes.length) {
    throw new Error('supportedDependencyTypes is empty')
}

const supportedVersionings = getVersionings()
const supportedStaticVersionings: string[] = []
const supportedDynamicVersionings: string[] = []
supportedVersionings.forEach((api, key) => {
    if (isVersioningApiConstructor(api)) {
        supportedDynamicVersionings.push(key)
    } else {
        supportedStaticVersionings.push(key)
    }
})
supportedStaticVersionings.sort()
supportedDynamicVersionings.sort()
if (!supportedStaticVersionings.length) {
    throw new Error('supportedStaticVersionings is empty')
}
if (!supportedDynamicVersionings.length) {
    throw new Error('supportedDynamicVersionings is empty')
}


const encoding = 'utf8'
const content = fs.readFileSync('config.schema.json', encoding)
const json = JSON.parse(content)


const dependencyTypesPattern = (function() {
    const pattens = supportedDependencyTypes.map(type => {
        const fetcher = supportedVersionFetchers.get(type)
        if (fetcher == null) {
            return type
        }

        if (fetcher.withDependencies) {
            return `${type}:.+`
        } else {
            return type
        }
    })
    return `^(${pattens.join('|')})$`
})()

const dynamicVersioningsPattern = `^(${supportedDynamicVersionings.join('|')})(:[^:]+)*$`

function modify(value) {
    if (is.plainObject(value)) {
        for (const key of Object.keys(value)) {
            modify(value[key])
        }

        if (!!value['x-with-supported-dependency-types-enum']) {
            value['enum'] = supportedDependencyTypes
        }

        if (!!value['x-with-supported-dependency-types-pattern']) {
            value['pattern'] = dependencyTypesPattern
        }

        if (!!value['x-with-supported-dependency-key-types-pattern']) {
            const patternProperties: any = value['patternProperties']
            if (isNotEmpty(patternProperties)) {
                const values = Object.values(patternProperties)
                Object.keys(patternProperties).forEach(key => delete patternProperties[key])
                for (const value of values) {
                    patternProperties[dependencyTypesPattern] = value
                }
            }
        }

        if (!!value['x-with-supported-static-versionings-enum']) {
            value['enum'] = supportedStaticVersionings
        }

        if (!!value['x-with-supported-dynamic-versionings-pattern']) {
            value['pattern'] = dynamicVersioningsPattern
        }

    } else if (Array.isArray(value)) {
        for (const element of value) {
            modify(element)
        }
    }
}

modify(json)

fs.writeFileSync('config.schema.json', JSON.stringify(json, null, 2) + '\n', encoding)
