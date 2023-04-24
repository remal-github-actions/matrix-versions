process.env.RENOVATE_X_IGNORE_RE2 = 'true'
process.env.HIDE_ACTION_DEBUG = 'true'

require('./src/internal/initRenovateLogging').initRenovateLogging()
