import globalCompatibilities from '../global-compatibilities.json'
import { validateConfig } from './internal/config-functions.js'

export const defaultCompatibilitiesConfig = validateConfig(
    globalCompatibilities,
    'builtin:global-compatibilities.json',
)
