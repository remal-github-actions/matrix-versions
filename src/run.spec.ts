import { run } from './run'

describe('run', () => {
    it('simple', async () => {
        return run('test', [], `

matrix:
  spring-boot:
    dependency: maven:org.springframework.boot:spring-boot-dependencies

        `)
    })
})
