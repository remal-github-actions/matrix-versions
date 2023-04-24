import { clone, indent } from './utils'

describe(indent.name, () => {

    it('one line', ()=>{
        expect(indent('1', 2))
            .toEqual('  1')
    })

    it('two lines', ()=>{
        expect(indent('1\n2', 2))
            .toEqual('  1\n  2')
    })

})

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
