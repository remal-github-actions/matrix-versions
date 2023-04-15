import is from '@sindresorhus/is'

export function isNotEmpty(object: any): boolean {
    if (object == null) {
        return false
    } else if (Array.isArray(object)) {
        return !!object.length
    } else if (is.plainObject(object)) {
        return !!Object.keys(object).length
    } else {
        return !!object.toString().length
    }
}

export function isEmpty(object: any): boolean {
    return !isNotEmpty(object)
}

export function processObjectFieldsRecursively(object: any, action: (key: string, value: any) => any) {
    if (is.plainObject(object)) {
        for (const key of Object.keys(object)) {
            const value = object[key]
            const newValue = action(key, value)
            if (newValue === undefined) {
                delete object[key]
            } else {
                object[key] = newValue
                processObjectFieldsRecursively(newValue, action)
            }
        }

    } else if (Array.isArray(object)) {
        for (const element of object) {
            processObjectFieldsRecursively(element, action)
        }
    }
}
