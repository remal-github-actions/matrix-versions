import { clone } from './utils'

describe(clone.name, () => {

    it('object', () => {
        const value = { field: 1 }
        const clonedValue = clone(value)
        expect(clonedValue).toEqual(value)
        expect(clonedValue === value).toEqual(false)
    })

    it('array', () => {
        const value = [1]
        const clonedValue = clone(value)
        expect(clonedValue).toEqual(value)
        expect(clonedValue === value).toEqual(false)
    })

    it('array in object', () => {
        const value = { field: [1] }
        const clonedValue = clone(value)
        expect(clonedValue).toEqual(value)
        expect(clonedValue === value).toEqual(false)
    })

})
