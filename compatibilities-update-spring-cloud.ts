// Importing validateConfig transitively loads renovate; this flag makes renovate skip the native re2 module
// (same as in config.schema-update.ts).
process.env.RENOVATE_X_IGNORE_RE2 = 'true'


import * as fs from 'fs'
import { HTMLElement, NodeType, parse as parseHtml } from 'node-html-parser'
import { setTimeout as sleep } from 'timers/promises'
import { validateConfig } from './src/internal/config-functions.js'
import { CompatibilityItem } from './src/internal/config.js'


// The 'Release train Spring Boot compatibility' table of the Spring Cloud project page, fetched through
// the Gatsby page-data endpoint: it serves the same rendered overview HTML as the readable
// https://spring.io/projects/spring-cloud page, but as a small content-only JSON document.
// This table is an exception to the raw-over-HTML preference: it has no raw source file to prefer (the
// content lives in the spring.io CMS, not in any repository), and the raw third-party alternatives are
// worse (the spring-cloud-release wiki misses the Dalston train and the patch-level 'Starting with' facts).
const springCloudProjectPageUrl = 'https://spring.io/projects/spring-cloud'
const springCloudPageDataUrl = 'https://spring.io/page-data/projects/spring-cloud/page-data.json'

const springBootDependency = 'maven:org.springframework.boot:spring-boot-dependencies'

const reviewMessage = `Review ${springCloudProjectPageUrl} and update compatibilities-update-spring-cloud.ts`


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
            + ` The page-data endpoint is a build artifact of the spring.io website, so the website was`
            + ` likely restructured: check that ${springCloudProjectPageUrl} still shows the release train`
            + ` compatibility table and update the URL in compatibilities-update-spring-cloud.ts`)
    }
    throw new Error(`Fetching ${url} failed with status ${response.status}.`
        + ` Review ${url} and update compatibilities-update-spring-cloud.ts`)
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


// The rendered project overview HTML (the content that contains the compatibility table) sits at
// 'result.data.page.html' of the page-data JSON document.
function extractPageHtml(pageDataContent: string): string {
    let pageData
    try {
        pageData = JSON.parse(pageDataContent)
    } catch (error) {
        throw new Error(`The content of ${springCloudPageDataUrl} is not valid JSON: ${error}. ${reviewMessage}`)
    }
    const pageHtml = pageData?.result?.data?.page?.html
    if (typeof pageHtml !== 'string' || !pageHtml.length) {
        throw new Error(`'result.data.page.html' of ${springCloudPageDataUrl} must be a non-empty string.`
            + ` ${reviewMessage}`)
    }
    return pageHtml
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

function collapseWhitespace(string: string): string {
    return string.replaceAll(/\s+/g, ' ').trim()
}

// Missing version segments compare as zero in version range matching (proven by
// src/internal/version-utils.spec.ts: '[1,2)' matches '1.1'), so trailing '.0' segments carry no meaning
// and generated bounds drop them: '3.0' becomes '3', '2.0.0' becomes '2'.
function trimTrailingZeroSegments(version: string): string {
    return version.replace(/(?:\.0)+$/, '')
}


interface SpringBootGenerationSegment {
    // A Spring Boot generation, taken from a '<major>.<minor>.x' segment of the 'Spring Boot Generation'
    // cell: '4.0' from '4.0.x'.
    springBootGeneration: string
    // The full Spring Cloud version that introduced the support of the generation ('2025.1.2',
    // 'Hoxton.SR5'), built from the '(Starting with <version>)' qualifier; undefined for the first
    // segment of a train, whose generation is supported from the train start.
    startingWith?: string
}

interface SpringCloudTrainIdentity {
    // The lower version bound of the train: '2025.1' for a calendar-versioned train, and the codename
    // initial ('H' for Hoxton) for a letter-era train whose versions look like 'Hoxton.SR5'.
    trainLowerBound: string
    codename: string
    isCalendarVersioned: boolean
}

interface SpringCloudTrain extends SpringCloudTrainIdentity {
    springBootGenerationSegments: SpringBootGenerationSegment[]
}


const releaseTrainColumnName = 'Release Train'
const springBootGenerationColumnName = 'Spring Boot Generation'

// A consumed cell may contain only text and links (the release train names link to their release notes);
// the link markup is transparent for the cell text. Anything else, including HTML comments (the parser is
// configured to keep them), is an unknown format change and must fail.
function consumedCellText(cell: HTMLElement): string {
    for (const childNode of cell.childNodes) {
        if (childNode.nodeType === NodeType.TEXT_NODE) {
            continue
        }
        if (childNode instanceof HTMLElement
            && childNode.tagName === 'A'
            && childNode.childNodes.every(linkChild => linkChild.nodeType === NodeType.TEXT_NODE)
        ) {
            continue
        }
        throw new Error(`The table cell '${collapseWhitespace(cell.innerHTML)}' contains something else`
            + ` than text and links. ${reviewMessage}`)
    }
    return collapseWhitespace(cell.text)
}

// A release train cell is '<year>.<number>.x aka <Codename>' for a calendar-versioned train ('2025.1.x
// aka Oakwood') and a bare '<Codename>' for a letter-era train ('Hoxton'); an optional '*' after the
// version marks a train that reached end of life. The letter-era codenames are London station names
// assigned in alphabetical order, so the codename initial identifies such a train.
function parseReleaseTrainCell(releaseTrainCellText: string): SpringCloudTrainIdentity {
    const calendarVersionedMatch = releaseTrainCellText.match(/^(\d{4}\.\d+)\.x\*? aka ([A-Z][A-Za-z]+)$/)
    if (calendarVersionedMatch) {
        return {
            trainLowerBound: calendarVersionedMatch[1],
            codename: calendarVersionedMatch[2],
            isCalendarVersioned: true,
        }
    }
    const letterMatch = releaseTrainCellText.match(/^([A-Z][A-Za-z]+)\*?$/)
    if (letterMatch) {
        const codename = letterMatch[1]
        return {
            trainLowerBound: codename.charAt(0),
            codename,
            isCalendarVersioned: false,
        }
    }
    throw new Error(`Unsupported '${releaseTrainColumnName}' cell '${releaseTrainCellText}'.`
        + ` Supported formats: '<year>.<number>.x aka <Codename>' and '<Codename>',`
        + ` with an optional '*' end-of-life marker after the version. ${reviewMessage}`)
}

// A 'Spring Boot Generation' cell is a comma-separated list of '<major>.<minor>.x' Spring Boot
// generations: '2.6.x, 2.7.x (Starting with 2021.0.3)'. The first generation is supported by the whole
// train; every following generation carries a '(Starting with <version>)' qualifier naming the Spring
// Cloud version that introduced its support. A calendar-versioned train qualifies with a full patch
// version ('2021.0.3'); a letter-era train qualifies with a bare service release name ('SR5' on the
// Hoxton row means Hoxton.SR5).
function parseSpringBootGenerationCell(
    train: SpringCloudTrainIdentity,
    springBootGenerationCellText: string,
): SpringBootGenerationSegment[] {
    const segments: SpringBootGenerationSegment[] = []
    for (const segmentText of springBootGenerationCellText.split(',').map(segment => segment.trim())) {
        const segmentMatch = segmentText.match(/^(\d+\.\d+)\.x(?: \(Starting with ([A-Za-z0-9.]+)\))?$/)
        if (!segmentMatch) {
            throw new Error(`Unsupported '${springBootGenerationColumnName}' cell segment '${segmentText}'`
                + ` of the '${train.codename}' train.`
                + ` Supported format: '<major>.<minor>.x', optionally followed by ' (Starting with <version>)'.`
                + ` ${reviewMessage}`)
        }
        const springBootGeneration = segmentMatch[1]
        const qualifier = segmentMatch[2]

        const previousSegment = segments[segments.length - 1]
        if (previousSegment != null
            && compareVersions(springBootGeneration, previousSegment.springBootGeneration) <= 0
        ) {
            throw new Error(`The Spring Boot generations of the '${train.codename}' train are not strictly`
                + ` ascending: '${springBootGeneration}' follows '${previousSegment.springBootGeneration}'.`
                + ` ${reviewMessage}`)
        }

        if (qualifier == null) {
            // Only the first generation is supported from the train start; every following generation
            // must say which version introduced it, or the entry building below would be wrong.
            if (segments.length) {
                throw new Error(`The non-first segment '${segmentText}' of the`
                    + ` '${springBootGenerationColumnName}' cell of the '${train.codename}' train`
                    + ` must have a '(Starting with <version>)' qualifier. ${reviewMessage}`)
            }
            segments.push({ springBootGeneration })
            continue
        }
        if (!segments.length) {
            throw new Error(`The first segment '${segmentText}' of the '${springBootGenerationColumnName}'`
                + ` cell of the '${train.codename}' train must not have a '(Starting with <version>)'`
                + ` qualifier. ${reviewMessage}`)
        }

        let startingWith: string
        if (train.isCalendarVersioned) {
            if (!qualifier.match(/^\d{4}\.\d+\.\d+$/) || !qualifier.startsWith(`${train.trainLowerBound}.`)) {
                throw new Error(`The 'Starting with' version '${qualifier}' of the '${train.codename}' train`
                    + ` is not a full patch version of the '${train.trainLowerBound}' train. ${reviewMessage}`)
            }
            startingWith = qualifier
        } else {
            if (!qualifier.match(/^[A-Za-z0-9]+$/)) {
                throw new Error(`The 'Starting with' value '${qualifier}' of the '${train.codename}' train`
                    + ` is not a bare service release name. ${reviewMessage}`)
            }
            startingWith = `${train.codename}.${qualifier}`
        }

        const previousStartingWith = previousSegment?.startingWith
        if (previousStartingWith != null) {
            if (!train.isCalendarVersioned) {
                // Letter-era service release names are not reliably comparable, and the table has never
                // had more than one qualified segment on a letter-era row, so such a row must get
                // human eyes.
                throw new Error(`The letter-era '${train.codename}' train has multiple`
                    + ` '(Starting with <version>)' qualifiers, which cannot be ordered reliably.`
                    + ` ${reviewMessage}`)
            }
            if (compareVersions(startingWith, previousStartingWith) <= 0) {
                throw new Error(`The 'Starting with' versions of the '${train.codename}' train are not`
                    + ` strictly ascending: '${startingWith}' follows '${previousStartingWith}'.`
                    + ` ${reviewMessage}`)
            }
        }
        segments.push({ springBootGeneration, startingWith })
    }
    return segments
}

// Translates the release train compatibility table(s) into the list of trains with their Spring Boot
// generation segments, in the document order (the table lists the trains newest first). The parser is
// deliberately strict: except for insignificant whitespace, any deviation from the known table format
// must fail, so that every format change gets human eyes.
function parseCompatibilityTables(pageHtml: string): SpringCloudTrain[] {
    // 'comment: true' keeps HTML comments as nodes, so that a comment inside a consumed cell fails the
    // strict cell content check instead of being silently dropped.
    const documentRoot = parseHtml(pageHtml, { comment: true })

    const trains: SpringCloudTrain[] = []
    let tableCount = 0
    for (const table of documentRoot.querySelectorAll('table')) {
        // A table is a compatibility table when its header resolves both consumed columns by name.
        // Header cells are read leniently (markup-transparent text): they are only used to recognize the
        // compatibility table, and an unrelated table must be skipped, not failed on.
        const headerCells = table.querySelectorAll('thead th').map(headerCell => collapseWhitespace(headerCell.text))
        const releaseTrainColumn = headerCells.indexOf(releaseTrainColumnName)
        const springBootGenerationColumn = headerCells.indexOf(springBootGenerationColumnName)
        if (releaseTrainColumn < 0 || springBootGenerationColumn < 0) {
            continue
        }
        ++tableCount

        // Rows outside of '<thead>' and '<tbody>' would be invisible to the selectors below, so their
        // presence must fail instead of losing data silently.
        const dataRows = table.querySelectorAll('tbody tr')
        const headerRowCount = table.querySelectorAll('thead tr').length
        const allRowCount = table.querySelectorAll('tr').length
        if (headerRowCount + dataRows.length !== allRowCount) {
            throw new Error(`The compatibility table has ${allRowCount} rows, but only ${headerRowCount}`
                + ` of them are header rows and ${dataRows.length} are data rows. ${reviewMessage}`)
        }
        if (!dataRows.length) {
            throw new Error(`No data rows found in the compatibility table. ${reviewMessage}`)
        }

        for (const dataRow of dataRows) {
            const cells = dataRow.querySelectorAll('td')
            if (cells.length !== headerCells.length) {
                throw new Error(`Expected ${headerCells.length} cells, but got ${cells.length}`
                    + ` in the row '${collapseWhitespace(dataRow.innerHTML)}'. ${reviewMessage}`)
            }
            const train = parseReleaseTrainCell(consumedCellText(cells[releaseTrainColumn]))
            trains.push({
                ...train,
                springBootGenerationSegments: parseSpringBootGenerationCell(
                    train,
                    consumedCellText(cells[springBootGenerationColumn]),
                ),
            })
        }
    }

    if (!tableCount) {
        throw new Error(`No tables with the '${releaseTrainColumnName}' and '${springBootGenerationColumnName}'`
            + ` columns found at ${springCloudPageDataUrl}. ${reviewMessage}`)
    }

    // The trains must be listed newest first, the calendar-versioned era before the letter era; the entry
    // chaining below relies on this order. Strict descending order also rejects duplicated trains.
    for (let index = 1; index < trains.length; ++index) {
        const newerTrain = trains[index - 1]
        const olderTrain = trains[index]
        const isStrictlyOlder = olderTrain.isCalendarVersioned
            ? newerTrain.isCalendarVersioned
                && compareVersions(olderTrain.trainLowerBound, newerTrain.trainLowerBound) < 0
            : newerTrain.isCalendarVersioned
                || olderTrain.trainLowerBound < newerTrain.trainLowerBound
        if (!isStrictlyOlder) {
            throw new Error(`The release trains are not listed newest first:`
                + ` '${olderTrain.codename}' follows '${newerTrain.codename}'. ${reviewMessage}`)
        }
    }

    return trains
}


// Builds the compatibility entries by strict global chaining, newest first: every train spans from its
// lower bound up to the next newer train's lower bound, and every '(Starting with <version>)' qualifier
// splits its train's span into sub-entries, so the entries tile the whole Spring Cloud version line down
// to Dalston without gaps. There is deliberately no bottom sentinel: the trains older than Dalston
// (Camden, Brixton, Angel) are not documented and stay unconstrained.
function buildCompatibilityItems(trains: SpringCloudTrain[]): CompatibilityItem[] {
    // The top sentinel excludes Spring Cloud trains newer than the newest documented one from every
    // Spring Boot version (via an impossible Spring Boot range) until the docs cover them.
    const newestTrain = trains[0]
    if (!newestTrain.isCalendarVersioned) {
        throw new Error(`The newest release train '${newestTrain.codename}' is not calendar-versioned,`
            + ` so the top sentinel bound cannot be derived. ${reviewMessage}`)
    }
    const [newestYear, newestRelease] = newestTrain.trainLowerBound.split('.').map(Number)
    const topSentinelLowerBound = `${newestYear}.${newestRelease + 1}`

    const dataEntries: { lowerBound: string, upperBound: string, springBootRange: string }[] = []
    for (let trainIndex = 0; trainIndex < trains.length; ++trainIndex) {
        const train = trains[trainIndex]

        // A letter-era train ends at the next newer train's codename INITIAL, not at its lower bound:
        // letter-era versions ('Hoxton.SR5') and calendar versions ('2020.0') do not compare reliably
        // with each other, so the Hoxton entries end at 'I' (from Ilford), never at '2020.0'.
        let nextUpperBound: string
        if (trainIndex === 0) {
            nextUpperBound = topSentinelLowerBound
        } else if (train.isCalendarVersioned) {
            nextUpperBound = trains[trainIndex - 1].trainLowerBound
        } else {
            nextUpperBound = trains[trainIndex - 1].codename.charAt(0)
        }

        // The sub-entries go newest first: the whole train supports its first documented generation, and
        // each '(Starting with <version>)' qualifier extends the support up to its generation from its
        // version on, so the sub-entries below a qualifier lose the qualified generations one by one.
        const segments = train.springBootGenerationSegments
        const firstGeneration = segments[0].springBootGeneration
        for (let segmentIndex = segments.length - 1; segmentIndex >= 0; --segmentIndex) {
            const segment = segments[segmentIndex]
            const lowerBound = segment.startingWith ?? train.trainLowerBound
            const upperBound = nextUpperBound
            nextUpperBound = lowerBound
            // The Spring Boot range doubles as the collapse comparison key below, so it is built
            // already trimmed.
            const springBootRange = `[${trimTrailingZeroSegments(firstGeneration)},`
                + ` ${segment.springBootGeneration}.9999)`

            const previousEntry = dataEntries[dataEntries.length - 1]
            if (previousEntry != null
                && previousEntry.springBootRange === springBootRange
                && previousEntry.lowerBound === upperBound
            ) {
                // Neighboring entries with an identical Spring Boot range collapse into one (Edgware and
                // Dalston both support only Spring Boot 1.5.x). The bounds must actually touch: at the
                // era boundary, the newest Hoxton entry ends at 'I' while the oldest Ilford entry starts
                // at '2020.0', and such entries must not collapse even with equal Spring Boot ranges.
                previousEntry.lowerBound = lowerBound
            } else {
                dataEntries.push({ lowerBound, upperBound, springBootRange })
            }
        }
    }

    // A fixed literal key order keeps the serialized output stable.
    return [
        {
            versionRange: `[${topSentinelLowerBound}, )`,
            dependency: springBootDependency,
            dependencyVersionRange: '(9999, )',
        },
        ...dataEntries.map(entry => ({
            versionRange: `[${trimTrailingZeroSegments(entry.lowerBound)},`
                + ` ${trimTrailingZeroSegments(entry.upperBound)})`,
            dependency: springBootDependency,
            dependencyVersionRange: entry.springBootRange,
        })),
    ]
}


const encoding = 'utf8'
const globalCompatibilitiesFile = 'global-compatibilities.json'
const springCloudSectionKey = 'maven:org.springframework.cloud:spring-cloud-dependencies'
const content = fs.readFileSync(globalCompatibilitiesFile, encoding)
const json = JSON.parse(content)

// The script only regenerates an existing section, so a missing or empty one means a broken file.
const currentItems: CompatibilityItem[] = json.globalCompatibilities?.[springCloudSectionKey]
if (!Array.isArray(currentItems) || !currentItems.length) {
    throw new Error(`'${springCloudSectionKey}' of 'globalCompatibilities' in ${globalCompatibilitiesFile}`
        + ` must be a non-empty array`)
}

const pageHtml = extractPageHtml(await fetchText(springCloudPageDataUrl))
const trains = parseCompatibilityTables(pageHtml)
const newItems = buildCompatibilityItems(trains)

// Shrink check: a release train disappearing from the compatibility table requires a human decision.
// Range changes for still documented trains are the normal case and go through.
const documentedCalendarTrainLowerBounds = new Set(
    trains.filter(train => train.isCalendarVersioned).map(train => train.trainLowerBound),
)
const documentedLetterTrainInitials = new Set(
    trains.filter(train => !train.isCalendarVersioned).map(train => train.trainLowerBound),
)
const documentedLetterTrainCodenames = new Set(
    trains.filter(train => !train.isCalendarVersioned).map(train => train.codename),
)
for (const currentItem of currentItems) {
    if (currentItem.dependencyVersionRange === '(9999, )') {
        continue // the top sentinel has no table row by design
    }
    const lowerBoundMatch = currentItem.versionRange.match(/^[\[(]([^,]*),/)
    if (lowerBoundMatch == null) {
        throw new Error(`Cannot extract the lower bound of the version range '${currentItem.versionRange}'`
            + ` of '${springCloudSectionKey}' in ${globalCompatibilitiesFile}. ${reviewMessage}`)
    }
    const lowerBound = lowerBoundMatch[1].trim()
    if (!lowerBound.length) {
        continue // defensive: a '( , <version>)' bottom sentinel would have no table row by design
    }

    let trainKey: string
    let documented: boolean
    if (lowerBound.match(/^\d/)) {
        // A calendar-versioned bound: its first two segments name the train, and a bare '<year>' bound
        // (a '<year>.0' train bound with its trailing '.0' trimmed, and the hand-maintained pre-automation
        // style, e.g. '[2022, 2023)') means the first train of the year.
        const boundSegments = lowerBound.split('.')
        trainKey = boundSegments.length >= 2 ? boundSegments.slice(0, 2).join('.') : `${lowerBound}.0`
        documented = documentedCalendarTrainLowerBounds.has(trainKey)
    } else if (lowerBound.match(/^[A-Z]$/)) {
        // A bare codename initial: '[G, H)'.
        trainKey = lowerBound
        documented = documentedLetterTrainInitials.has(trainKey)
    } else if (lowerBound.match(/^[A-Z][A-Za-z]+\./)) {
        // A full letter-era version: '[Hoxton.SR5, I)'.
        trainKey = lowerBound.split('.')[0]
        documented = documentedLetterTrainCodenames.has(trainKey)
    } else {
        throw new Error(`Cannot derive a release train from the lower bound '${lowerBound}'`
            + ` of '${springCloudSectionKey}' in ${globalCompatibilitiesFile}. ${reviewMessage}`)
    }
    if (!documented) {
        throw new Error(`The Spring Cloud '${trainKey}' release train is present in ${globalCompatibilitiesFile}`
            + ` but not in the compatibility table anymore. ${reviewMessage}`)
    }
}

// Assigning in place keeps the key order of the surrounding object.
json.globalCompatibilities[springCloudSectionKey] = newItems

// validateConfig mutates its argument (it deletes $schema), so it gets a clone to keep the object
// that is serialized below intact.
validateConfig(structuredClone(json))

// global-compatibilities.json round-trips byte-identically through JSON.parse and this serialization,
// so comparing against the original content detects any real change.
const newContent = JSON.stringify(json, null, 2) + '\n'
if (newContent === content) {
    console.log(`${globalCompatibilitiesFile} is up-to-date`)
} else {
    const currentSpringBootRanges = new Map(currentItems.map(item => [item.versionRange, item.dependencyVersionRange]))
    const newVersionRanges = new Set(newItems.map(item => item.versionRange))
    for (const newItem of newItems) {
        const currentSpringBootRange = currentSpringBootRanges.get(newItem.versionRange)
        if (currentSpringBootRange == null) {
            console.log(`Spring Cloud ${newItem.versionRange}:`
                + ` added with Spring Boot range ${newItem.dependencyVersionRange}`)
        } else if (currentSpringBootRange !== newItem.dependencyVersionRange) {
            console.log(`Spring Cloud ${newItem.versionRange}:`
                + ` Spring Boot range changed from ${currentSpringBootRange} to ${newItem.dependencyVersionRange}`)
        }
    }
    for (const currentItem of currentItems) {
        if (!newVersionRanges.has(currentItem.versionRange)) {
            console.log(`Spring Cloud ${currentItem.versionRange}: removed`
                + ` (the Spring Boot range was ${currentItem.dependencyVersionRange})`)
        }
    }
    fs.writeFileSync(globalCompatibilitiesFile, newContent, encoding)
    console.log(`${globalCompatibilitiesFile} updated`)
}
