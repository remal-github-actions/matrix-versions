import { run } from './run'

describe('run', () => {
    it('simple', async () => {
        return run(undefined, [], `

matrix:
  spring-boot:
    dependency: maven:org.springframework.boot:spring-boot-dependencies

        `)
    })
})
