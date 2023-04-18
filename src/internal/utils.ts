import is from '@sindresorhus/is'

export const byNewLineAndComma: RegExp = /[\n\r,;]+/g

export function normalizeSpaces(string: string): string {
    return string.replaceAll(/(\r\n)|(\n\r)|\r/g, '\n')
}

export function indent(string: string, indention: string | number): string {
    if (is.number(indention)) {
        indention = ' '.repeat(indention)
    }
    return indention + string.replaceAll(/(\r\n)|(\n\r)|\n|\r/g, '$1' + indention)
}

export function removeFromArray<T>(array: T[], elementToRemove: T) {
    const index = array.indexOf(elementToRemove, 0)
    if (index >= 0) {
        array.splice(index, 1)
    }
}

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

export function processObjectFieldsRecursively(object: any, action: (key: string, value: any) => any): void {
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


export function shuffleArray<T>(array: T[]): T[] {
    let currentIndex = array.length
    while (currentIndex > 0) {
        const randomIndex = Math.floor(Math.random() * currentIndex)
        --currentIndex;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
    }

    return array
}

export const getErrorOf = async <TError>(call: () => Promise<unknown>): Promise<TError> => {
    try {
        await call()
        throw new NoErrorThrownError()
    } catch (error: unknown) {
        return error as TError
    }
}

export class NoErrorThrownError extends Error {
}
