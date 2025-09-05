import merge from 'deepmerge'

export const byNewLineAndComma: RegExp = /[\n\r,;]+/g


export function isNumber(value: unknown): value is number {
    return typeof value === 'number'
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function isFunction(value: unknown): value is Function {
    return typeof value === 'function'
}

export function isPlainObject<Value = unknown>(value: unknown): value is Record<string | number | symbol, Value> {
    if (Object.prototype.toString.call(value) !== '[object Object]') {
        return false
    }

    const prototype = Object.getPrototypeOf(value)
    return prototype === null || prototype === Object.getPrototypeOf({})
}


export function normalizeSpaces(string: string): string {
    return string.replaceAll(/(\r\n)|(\n\r)|\r/g, '\n')
}

export function indent(string: string, indention: string | number): string {
    if (isNumber(indention)) {
        indention = ' '.repeat(indention)
    }
    return indention + string.replaceAll(/((\r\n)|(\n\r)|\n|\r)/g, '$1' + indention)
}

export function clone<T>(value: T): T {
    return merge.all([value])
}

export function removeFromArrayIf<T>(array: T[], predicate: (element: T) => boolean): void {
    for (let index = 0; index < array.length; ++index) {
        const element = array[index]
        if (predicate(element)) {
            array.splice(index, 1)
            --index
        }
    }
}

export function removeFromArray<T>(array: T[], elementToRemove: T): void {
    removeFromArrayIf(array, element => element === elementToRemove)
}

export function onlyUnique(value: any, index: number, array: Array<any>): boolean {
    return array.indexOf(value) === index
}

export function onlyUniqueBy(extractor: (value: any) => any): (value: any) => boolean {
    const seen = new Set()
    return (value: any): boolean => {
        const extracted = extractor(value)
        if (seen.has(extracted)) {
            return false
        } else {
            seen.add(extracted)
            return true
        }
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
    } else if (isPlainObject(object)) {
        return !!(Object.keys(object).length)
    } else {
        return !!((object as any).toString().length)
    }
}

export function processObjectFieldsRecursively(object: any, action: (key: string, value: any) => any): void {
    if (isPlainObject(object)) {
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

export function shuffleArray<T>(array: T[]): T[] {
    let currentIndex = array.length
    while (currentIndex > 0) {
        const randomIndex = Math.floor(Math.random() * currentIndex)
        --currentIndex;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
    }

    return array
}

export function escapeRegex(string: string): string {
    return string
        .replaceAll('\\', '\\\\')
        .replaceAll('\r', '\\r')
        .replaceAll('\n', '\\n')
        .replaceAll('\t', '\\t')
        .replaceAll('.', '\\.')
        .replaceAll('|', '\\|')
        .replaceAll('[', '\\[')
        .replaceAll(']', '\\]')
        .replaceAll('(', '\\(')
        .replaceAll(')', '\\)')
        .replaceAll('?', '\\?')
        .replaceAll('*', '\\*')
        .replaceAll('+', '\\+')
        .replaceAll('{', '\\{')
        .replaceAll('}', '\\}')
        .replaceAll('^', '\\^')
        .replaceAll('$', '\\$')
}

export function toSortedByKey<V>(
    obj: Record<string, V>,
    compareFn?: (k1: string, k2: string) => number,
): Record<string, V> {
    const result: Record<string, V> = {}

    const sortedKeys = Object.keys(obj).toSorted(compareFn)
    for (const key of sortedKeys) {
        result[key] = obj[key]
    }

    return result
}

export function substringBefore(str: string, delim: string, defaultValue?: string): string {
    const pos = str.indexOf(delim)
    return pos >= 0
        ? str.substring(0, pos)
        : (defaultValue ?? str)
}


export const getErrorOf = async <TError>(call: () => Promise<unknown>): Promise<TError> => {
    try {
        await call()
        throw new NoErrorThrown()
    } catch (error: unknown) {
        return error as TError
    }
}

export class NoErrorThrown {
}
