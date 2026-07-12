import globalCompatibilities from '../global-compatibilities.json' with { type: 'json' }
import { validateConfig } from './internal/config-functions.js'

export const defaultCompatibilitiesConfig = validateConfig(
    globalCompatibilities,
    'builtin:global-compatibilities.json',
)
