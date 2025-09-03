expect.extend(require('jest-extended'))

require('./src/internal/initRenovateLogging').initRenovateLogging()

const core = require('@actions/core')
core.error = (message, properties) => {
    core.warning(`ERROR: ${message}`, properties)
}
