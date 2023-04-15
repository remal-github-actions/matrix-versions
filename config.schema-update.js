const fs = require('fs')
const is = require('@sindresorhus/is')


const supportedDependencyTypes = require('renovate/dist/modules/datasource').getDatasourceList()
if (!supportedDependencyTypes.length) {
    throw new Error('supportedDependencyTypes is not an array')
}

const supportedVersionTypes = require('renovate/dist/modules/versioning').getVersioningList()
if (!supportedVersionTypes.length) {
    throw new Error('supportedVersionTypes is not an array')
}


const encoding = 'utf8'
const content = fs.readFileSync('config.schema.json', encoding)
const json = JSON.parse(content)

function modify(value) {
    if (is.plainObject(value)) {
        for (const key of Object.keys(value)) {
            modify(value[key])
        }

        if (!!value['x-with-supported-dependency-types-enum']) {
            value['enum'] = supportedDependencyTypes
        }

        if (!!value['x-with-supported-dependency-types-pattern']) {
            value['pattern'] = `^(${supportedDependencyTypes.join('|')})(:.+)?$`
        }

        if (!!value['x-with-supported-version-types-enum']) {
            value['enum'] = supportedVersionTypes
        }

    } else if (Array.isArray(value)) {
        for (const element of value) {
            modify(element)
        }
    }
}

modify(json)

fs.writeFileSync('config.schema.json', JSON.stringify(json, null, 2) + '\n', encoding)
