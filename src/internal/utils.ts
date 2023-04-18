import is from '@sindresorhus/is'

export function isNotEmpty<Type>(object: Type | null | undefined): object is Type {
    if (object == null) {
        return false
    } else if (Array.isArray(object)) {
        return !!(object.length)
    } else if (object instanceof Map) {
        return !!(object.size)
    } else if (object instanceof Set) {
        return !!(object.size)
    } else if (is.plainObject(object)) {
        return !!(Object.keys(object).length)
    } else {
        return !!((object as any).toString().length)
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


export function onlyUnique(value: any, index: number, array: Array<any>): boolean {
    return array.indexOf(value) === index
}


export class NoErrorThrownError extends Error {
}

export const getError = async <TError>(call: () => Promise<unknown>): Promise<TError> => {
    try {
        await call()
        throw new NoErrorThrownError()
    } catch (error: unknown) {
        return error as TError
    }
}
