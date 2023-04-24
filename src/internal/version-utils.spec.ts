import { isInVersioningRange } from './version-utils'
import * as versionings from 'renovate/dist/modules/versioning'

describe(isInVersioningRange.name, () => {

    describe('maven', () => {
        const versioning = versionings.get('maven')

        function isInRange(version: string, range: string): boolean {
            return isInVersioningRange(versioning, 'test', version, range)
        }

        it('simple', () => {
            expect(isInRange('1.1', '[0,1]')).toEqual(false)
            expect(isInRange('1.1', '[1,2)')).toEqual(true)
        })

        it('calver', () => {
            expect(isInRange('2021.0.4', '[2020,2021]')).toEqual(false)
            expect(isInRange('2021.0.4', '[2021,2022)')).toEqual(true)
        })

        it('alphabetic-simple', () => {
            expect(isInRange('c', '[a,b]')).toEqual(false)
            expect(isInRange('c', '[a,c]')).toEqual(true)
        })

        it('spring-cloud-old-convention', () => {
            expect(isInRange('Hoxton.SR5', '[Hoxton,Hoxton]')).toEqual(false)
            expect(isInRange('Hoxton.SR5', '[Hoxton,Hoxton.SR5)')).toEqual(false)
            expect(isInRange('Hoxton.SR5', '[Hoxton.SR5,Hoxton.SR10]')).toEqual(true)
            expect(isInRange('Hoxton.SR5', '[Hoxton.SR5,Hoxton.SR9999)')).toEqual(true)

            expect(isInRange('Brixton.SR4', '[Angel.SR1,Brixton)')).toEqual(false)
            expect(isInRange('Brixton.SR4', '[Angel.SR1,Brixton.SR9999)')).toEqual(true)
            expect(isInRange('Brixton.SR4', '[Angel.SR1,Camden)')).toEqual(true)

            expect(isInRange('Camden.SR4', '[Camden,D)')).toEqual(true)
            expect(isInRange('Camden.SR4', '(C,D)')).toEqual(true)
            expect(isInRange('Camden.SR4', '(B,D)')).toEqual(true)
            expect(isInRange('Camden.SR4', '(B,C)')).toEqual(false)
            expect(isInRange('Camden.SR4', '(B,C]')).toEqual(false)
        })
    })

})
