import { expect } from '@jest/globals'
import jestExtendedMatchers from 'jest-extended'
import { initRenovateLogging } from './src/internal/initRenovateLogging.js'

expect.extend(jestExtendedMatchers)

initRenovateLogging()
