// Importing validateConfig transitively loads renovate; this flag makes renovate skip the native re2 module
// (same as in config.schema-update.ts).
process.env.RENOVATE_X_IGNORE_RE2 = 'true'


import * as fs from 'fs'
import { setTimeout as sleep } from 'timers/promises'
import { validateConfig } from './src/internal/config-functions.js'
import { CompatibilityItem } from './src/internal/config.js'


// The endoflife.date v1 API document for Spring Boot: every release cycle carries the supported Java
// versions in 'custom.supportedJavaVersions', which endoflife.date curates from the Spring Boot system
// requirements documentation (every upstream cycle cites the documentation page it was taken from).
// The field is declared 'display: api-only' upstream, so no rendered HTML page shows it and the
// raw-over-HTML preference does not apply. The API is preferred over the raw frontmatter of
// products/spring-boot.md in the endoflife-date/endoflife.date repository: the API is a versioned
// contract (see the 'schema_version' check below), while the frontmatter layout is an implementation
// detail of the endoflife.date build.
const springBootApiUrl = 'https://endoflife.date/api/v1/products/spring-boot'

const reviewMessage = `Review ${springBootApiUrl} and update compatibilities-update-spring-boot.ts`


// Network errors, timeouts, and 429/5xx responses are worth retrying; other HTTP errors fail immediately.
class RetriableFetchError extends Error {
}

async function fetchTextOnce(url: string): Promise<string> {
    let response: Response
    try {
        response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
        if (response.ok) {
            return await response.text()
        }
    } catch (error) {
        throw new RetriableFetchError(`Fetching ${url} failed: ${error}`)
    }

    if (response.status === 429 || response.status >= 500) {
        throw new RetriableFetchError(`Fetching ${url} failed with status ${response.status}`)
    }

    if (response.status === 404) {
        throw new Error(`Fetching ${url} failed with status 404.`
            + ` The v1 API endpoint or the product slug changed:`
            + ` check https://endoflife.date/docs/api/v1/ and https://endoflife.date/spring-boot`
            + ` and update the URL in compatibilities-update-spring-boot.ts`)
    }
    throw new Error(`Fetching ${url} failed with status ${response.status}.`
        + ` Review ${url} and update compatibilities-update-spring-boot.ts`)
}

async function fetchText(url: string): Promise<string> {
    const maxAttempts = 3
    for (let attempt = 1; ; ++attempt) {
        try {
            return await fetchTextOnce(url)
        } catch (error) {
            if (!(error instanceof RetriableFetchError) || attempt >= maxAttempts) {
                throw error
            }
            console.warn(`${error.message} (attempt ${attempt} of ${maxAttempts}), retrying in 5 seconds`)
            await sleep(5_000)
        }
    }
}


function compareVersions(version1: string, version2: string): number {
    const segments1 = version1.split('.').map(Number)
    const segments2 = version2.split('.').map(Number)
    for (let index = 0; index < Math.max(segments1.length, segments2.length); ++index) {
        const difference = (segments1[index] ?? 0) - (segments2[index] ?? 0)
        if (difference) {
            return difference
        }
    }
    return 0
}

// Missing version segments compare as zero in version range matching (proven by
// src/internal/version-utils.spec.ts: '[1,2)' matches '1.1'), so trailing '.0' segments carry no meaning
// and generated bounds drop them: '3.0' becomes '3', '2.0.0' becomes '2'.
function trimTrailingZeroSegments(version: string): string {
    return version.replace(/(?:\.0)+$/, '')
}


interface SpringBootReleaseCycle {
    // The release cycle name: the '<major>.<minor>' Spring Boot version line ('4.1').
    name: string
    // The bounds of the documented supported Java version range, as Java majors: 17 and 26 for '17 - 26'.
    javaMin: number
    javaMax: number
}

// Translates the API document into release cycles of {name, supported Java majors}, consuming only the
// 'name' and 'custom.supportedJavaVersions' fields of the 'result.releases' items. The parser is
// deliberately strict on everything it consumes: any deviation from the known format must fail, so that
// every format change gets human eyes. Unknown extra fields are ignored: the API adds fields freely
// within the same major schema version.
function parseReleaseCycles(apiContent: string): SpringBootReleaseCycle[] {
    let apiDocument
    try {
        apiDocument = JSON.parse(apiContent)
    } catch (error) {
        throw new Error(`The content of ${springBootApiUrl} is not valid JSON: ${error}. ${reviewMessage}`)
    }

    // A new major schema version restructures the document, so only '1.x' documents are accepted.
    const schemaVersion = apiDocument?.schema_version
    if (typeof schemaVersion !== 'string' || !schemaVersion.startsWith('1.')) {
        throw new Error(`'schema_version' of ${springBootApiUrl} must be a string starting with '1.',`
            + ` got '${schemaVersion}': check https://endoflife.date/docs/api/v1/ for the API change`
            + ` and update compatibilities-update-spring-boot.ts`)
    }

    const releases = apiDocument?.result?.releases
    if (!Array.isArray(releases) || !releases.length) {
        throw new Error(`'result.releases' of ${springBootApiUrl} must be a non-empty array. ${reviewMessage}`)
    }

    const cycles: SpringBootReleaseCycle[] = []
    for (const release of releases) {
        const name = release?.name
        if (typeof name !== 'string' || !name.match(/^\d+\.\d+$/)) {
            throw new Error(`Unsupported release name '${name}'. Supported format: '<major>.<minor>'.`
                + ` ${reviewMessage}`)
        }

        // The value is a span of Java majors with spaces around the hyphen: '17 - 26'.
        const supportedJavaVersions = release?.custom?.supportedJavaVersions
        const javaVersionsMatch = typeof supportedJavaVersions === 'string'
            ? supportedJavaVersions.match(/^(\d+) - (\d+)$/)
            : null
        if (javaVersionsMatch == null) {
            throw new Error(`Unsupported 'custom.supportedJavaVersions' value '${supportedJavaVersions}'`
                + ` of the '${name}' release. Supported format: '<min Java major> - <max Java major>'.`
                + ` ${reviewMessage}`)
        }
        const javaMin = Number(javaVersionsMatch[1])
        const javaMax = Number(javaVersionsMatch[2])
        if (javaMin > javaMax) {
            throw new Error(`The minimum supported Java version ${javaMin} of the '${name}' release`
                + ` is greater than the maximum ${javaMax}. ${reviewMessage}`)
        }

        cycles.push({ name, javaMin, javaMax })
    }

    // The releases are listed newest first; the entry chaining below relies on this order. Strict
    // descending order also rejects duplicated cycles.
    for (let index = 1; index < cycles.length; ++index) {
        if (compareVersions(cycles[index].name, cycles[index - 1].name) >= 0) {
            throw new Error(`The release cycles are not strictly descending:`
                + ` '${cycles[index].name}' appears after '${cycles[index - 1].name}'. ${reviewMessage}`)
        }
    }

    return cycles
}


// Builds the compatibility entries by strict global chaining, newest first: every release cycle spans
// from its name up to the next newer cycle's name, so the entries tile the whole Spring Boot version line
// from the oldest documented major up without gaps. Both Java bounds come from the documentation, so a
// new Java version reaches the entries only once endoflife.date raises the newest cycle's maximum.
function buildCompatibilityItems(cycles: SpringBootReleaseCycle[]): CompatibilityItem[] {
    // The top sentinel excludes Spring Boot cycles newer than the newest documented one from every Java
    // version (via an impossible Java range) until the documentation covers them.
    const [newestMajor, newestMinor] = cycles[0].name.split('.').map(Number)
    const topSentinelLowerBound = `${newestMajor}.${newestMinor + 1}`

    const dataEntries: { lowerBound: string, upperBound: string, javaRange: string }[] = []
    let nextUpperBound = topSentinelLowerBound
    for (const cycle of cycles) {
        // The Java max is widened to its whole major using the .9999 convention of
        // global-compatibilities.json: 26 becomes '26.9999'.
        const javaRange = `[${cycle.javaMin}, ${cycle.javaMax}.9999)`
        const previousEntry = dataEntries[dataEntries.length - 1]
        if (previousEntry != null && previousEntry.javaRange === javaRange) {
            // Consecutive cycles with an identical Java range collapse into one entry, even across
            // Spring Boot majors.
            previousEntry.lowerBound = cycle.name
        } else {
            dataEntries.push({ lowerBound: cycle.name, upperBound: nextUpperBound, javaRange })
        }
        nextUpperBound = cycle.name
    }

    // The oldest entry is extended down to the bare major of the oldest documented cycle ('1.5' becomes
    // '1'): the Spring Boot versions below the documented history (1.0-1.4 today) share the oldest
    // documented cycle's Java range. This is the one deliberate beyond-the-documentation extension: it
    // preserves the coverage of the previously hand-maintained '[1, 1.9999)' entry (and Spring Boot 1.0
    // did require Java 6).
    dataEntries[dataEntries.length - 1].lowerBound = cycles[cycles.length - 1].name.split('.')[0]

    // A fixed literal key order keeps the serialized output stable.
    return [
        {
            versionRange: `[${topSentinelLowerBound}, )`,
            dependency: 'java',
            dependencyVersionRange: '(9999, )',
        },
        ...dataEntries.map(entry => ({
            versionRange: `[${trimTrailingZeroSegments(entry.lowerBound)},`
                + ` ${trimTrailingZeroSegments(entry.upperBound)})`,
            dependency: 'java',
            dependencyVersionRange: entry.javaRange,
        })),
    ]
}


const encoding = 'utf8'
const globalCompatibilitiesFile = 'global-compatibilities.json'
const springBootSectionKey = 'maven:org.springframework.boot:spring-boot-dependencies'
const content = fs.readFileSync(globalCompatibilitiesFile, encoding)
const json = JSON.parse(content)

// The script only regenerates an existing section, so a missing or empty one means a broken file.
const currentItems: CompatibilityItem[] = json.globalCompatibilities?.[springBootSectionKey]
if (!Array.isArray(currentItems) || !currentItems.length) {
    throw new Error(`'${springBootSectionKey}' of 'globalCompatibilities' in ${globalCompatibilitiesFile}`
        + ` must be a non-empty array`)
}

const cycles = parseReleaseCycles(await fetchText(springBootApiUrl))
const newItems = buildCompatibilityItems(cycles)

// Shrink check: a release cycle disappearing from the API document requires a human decision. Java range
// changes for still documented cycles are the normal case and go through.
const documentedCycleNames = new Set(cycles.map(cycle => cycle.name))
const documentedCycleMajors = new Set(cycles.map(cycle => cycle.name.split('.')[0]))
for (const currentItem of currentItems) {
    if (currentItem.dependencyVersionRange === '(9999, )') {
        continue // the top sentinel has no release cycle by design
    }
    const lowerBoundMatch = currentItem.versionRange.match(/^[\[(]([^,]*),/)
    if (lowerBoundMatch == null) {
        throw new Error(`Cannot extract the lower bound of the version range '${currentItem.versionRange}'`
            + ` of '${springBootSectionKey}' in ${globalCompatibilitiesFile}. ${reviewMessage}`)
    }
    const lowerBound = lowerBoundMatch[1].trim()
    if (!lowerBound.length) {
        continue // defensive: a '( , <version>)' bottom sentinel would have no release cycle by design
    }

    let cycleKey: string
    let documented: boolean
    if (lowerBound.match(/^\d+(\.\d+)+$/)) {
        // A '<major>.<minor>' (or longer) bound: its first two segments name the release cycle.
        cycleKey = lowerBound.split('.').slice(0, 2).join('.')
        documented = documentedCycleNames.has(cycleKey)
    } else if (lowerBound.match(/^\d+$/)) {
        // A bare '<major>' bound is either a '<major>.0' cycle bound with its trailing '.0' trimmed, or
        // covers versions below the documented history (the extended oldest entry, and the hand-maintained
        // pre-automation entries): any documented cycle of the major suffices.
        cycleKey = lowerBound
        documented = documentedCycleMajors.has(cycleKey)
    } else {
        throw new Error(`Cannot derive a release cycle from the lower bound '${lowerBound}'`
            + ` of '${springBootSectionKey}' in ${globalCompatibilitiesFile}. ${reviewMessage}`)
    }
    if (!documented) {
        throw new Error(`Spring Boot ${cycleKey} is present in ${globalCompatibilitiesFile}`
            + ` but not in the API document anymore. ${reviewMessage}`)
    }
}

// Assigning in place keeps the key order of the surrounding object.
json.globalCompatibilities[springBootSectionKey] = newItems

// validateConfig mutates its argument (it deletes $schema), so it gets a clone to keep the object
// that is serialized below intact.
validateConfig(structuredClone(json))

// global-compatibilities.json round-trips byte-identically through JSON.parse and this serialization,
// so comparing against the original content detects any real change.
const newContent = JSON.stringify(json, null, 2) + '\n'
if (newContent === content) {
    console.log(`${globalCompatibilitiesFile} is up-to-date`)
} else {
    const currentJavaRanges = new Map(currentItems.map(item => [item.versionRange, item.dependencyVersionRange]))
    const newVersionRanges = new Set(newItems.map(item => item.versionRange))
    for (const newItem of newItems) {
        const currentJavaRange = currentJavaRanges.get(newItem.versionRange)
        if (currentJavaRange == null) {
            console.log(`Spring Boot ${newItem.versionRange}:`
                + ` added with Java range ${newItem.dependencyVersionRange}`)
        } else if (currentJavaRange !== newItem.dependencyVersionRange) {
            console.log(`Spring Boot ${newItem.versionRange}:`
                + ` Java range changed from ${currentJavaRange} to ${newItem.dependencyVersionRange}`)
        }
    }
    for (const currentItem of currentItems) {
        if (!newVersionRanges.has(currentItem.versionRange)) {
            console.log(`Spring Boot ${currentItem.versionRange}: removed`
                + ` (the Java range was ${currentItem.dependencyVersionRange})`)
        }
    }
    fs.writeFileSync(globalCompatibilitiesFile, newContent, encoding)
    console.log(`${globalCompatibilitiesFile} updated`)
}
