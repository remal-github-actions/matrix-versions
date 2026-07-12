// Importing validateConfig transitively loads renovate; this flag makes renovate skip the native re2 module
// (same as in config.schema-update.ts).
process.env.RENOVATE_X_IGNORE_RE2 = 'true'


import * as fs from 'fs'
import { setTimeout as sleep } from 'timers/promises'
import { validateConfig } from './src/internal/config-functions.js'
import { CompatibilityItem } from './src/internal/config.js'
import { normalizeSpaces } from './src/internal/utils.js'


// The markdown source of https://kotlinlang.org/docs/gradle-configure-project.html, fetched from master
// to get the latest data, including not yet released Kotlin and Gradle versions.
// The Gradle compatibility matrix (https://docs.gradle.org/current/userguide/compatibility.html) is NOT
// a suitable source: it covers Embedded Kotlin only, not the Kotlin Gradle plugin.
const kgpCompatibilityDocUrl = 'https://raw.githubusercontent.com/JetBrains/kotlin-web-site/master'
    + '/docs/topics/gradle/gradle-configure-project.md'

// Defines values for the %variable% placeholders used across the doc (the newest table row is templated
// as '%minGradleVersion%–%maxGradleVersion%'), as XML-ish lines like:
// <var name="maxGradleVersion" value="9.5.0" type="string"/>
const kotlinDocVariablesUrl = 'https://raw.githubusercontent.com/JetBrains/kotlin-web-site/master/docs/v.list'

const reviewMessage = `Review ${kgpCompatibilityDocUrl} and update compatibilities-update-kotlin-gradle-plugin.ts`


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
            + ` The file was moved in the JetBrains/kotlin-web-site repository:`
            + ` find its new location and update its URL in compatibilities-update-kotlin-gradle-plugin.ts`)
    }
    throw new Error(`Fetching ${url} failed with status ${response.status}.`
        + ` Review ${url} and update compatibilities-update-kotlin-gradle-plugin.ts`)
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


function parseDocVariables(variablesContent: string): Map<string, string> {
    const variables = new Map<string, string>()
    for (const match of variablesContent.matchAll(/<var\s+name="([^"]+)"\s+value="([^"]*)"/g)) {
        variables.set(match[1], match[2])
    }
    if (!variables.size) {
        throw new Error(`No variables found at ${kotlinDocVariablesUrl}.`
            + ` Review ${kotlinDocVariablesUrl} and update compatibilities-update-kotlin-gradle-plugin.ts`)
    }
    return variables
}

// Only tokens that have a value in v.list are substituted; a token left unsubstituted in a consumed
// table cell is reported by the table parser.
function substituteDocVariables(docContent: string, variables: Map<string, string>): string {
    return docContent.replaceAll(/%([^%\s]+)%/g, (token, name) => variables.get(name) ?? token)
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

function majorMinorOf(version: string): string {
    return version.split('.').slice(0, 2).join('.')
}


interface KgpCompatibilityRow {
    kgpRowStart: string
    gradleMin: string
    gradleMaxWidened: string
}

// Translates the two 'KGP version' markdown tables (the main one and the collapsed 'Earlier KGP versions'
// one) into rows of {KGP row start, Gradle min, widened Gradle max}, using only the 'KGP version' and
// 'Gradle min and max versions' columns. The parser is deliberately strict: except for extra blank lines,
// any deviation from the known table format must fail, so that every docs format change gets human eyes.
function parseKgpCompatibilityTables(docContent: string): KgpCompatibilityRow[] {
    const lines = docContent.split('\n')

    const kgpColumnName = 'KGP version'
    const gradleColumnName = 'Gradle min and max versions'

    // A row looks like '| 2.3.10 | 7.6.3–9.0.0 | 8.2.2–9.0.0 |': cells are separated by '|', with a
    // leading '|', a trailing '|', and sometimes trailing whitespace after it. Splitting on '|' produces
    // an empty first and last element for the outer pipes.
    function isTableRow(line: string): boolean {
        const trimmedLine = line.trimEnd()
        return trimmedLine.startsWith('|') && trimmedLine.endsWith('|')
    }

    function splitCells(line: string): string[] {
        return line.trimEnd().split('|').slice(1, -1).map(cell => cell.trim())
    }

    function assertNoUnsubstitutedVariable(cell: string, rowLine: string): void {
        const unsubstitutedVariable = cell.match(/%[^%\s]+%/)
        if (unsubstitutedVariable) {
            throw new Error(`The cell '${cell}' in the row '${rowLine}' contains the '${unsubstitutedVariable[0]}'`
                + ` variable that is not defined at ${kotlinDocVariablesUrl}. ${reviewMessage}`)
        }
    }

    const rows: KgpCompatibilityRow[] = []
    let tableCount = 0
    let lineIndex = 0
    while (lineIndex < lines.length) {
        // Any '|' row whose cells include both consumed column names starts a KGP compatibility table.
        // Other lines (prose, other tables) are skipped. The AGP column is not consumed, so its presence,
        // absence, or position does not matter.
        const headerLine = lines[lineIndex]
        if (!isTableRow(headerLine)) {
            ++lineIndex
            continue
        }
        const headerCells = splitCells(headerLine)
        const kgpColumn = headerCells.indexOf(kgpColumnName)
        const gradleColumn = headerCells.indexOf(gradleColumnName)
        if (kgpColumn < 0 || gradleColumn < 0) {
            ++lineIndex
            continue
        }
        ++tableCount

        const separatorLine = lines[lineIndex + 1]
        const separatorCells = separatorLine != null && isTableRow(separatorLine) ? splitCells(separatorLine) : null
        if (separatorCells == null
            || separatorCells.length !== headerCells.length
            || separatorCells.some(cell => !cell.match(/^:?-+:?$/))
        ) {
            throw new Error(`Expected a markdown table separator row after the header row '${headerLine}',`
                + ` got '${separatorLine ?? '<end of file>'}'. ${reviewMessage}`)
        }

        let dataRowCount = 0
        lineIndex += 2
        while (lineIndex < lines.length) {
            const rowLine = lines[lineIndex]
            // The table ends at the first blank or non-'|' line (the doc separates the tables from the
            // following prose with blank lines).
            if (!rowLine.trim().length || !rowLine.startsWith('|')) {
                break
            }
            if (!isTableRow(rowLine)) {
                throw new Error(`Expected a table row ending with '|', got '${rowLine}'. ${reviewMessage}`)
            }
            const cells = splitCells(rowLine)
            if (cells.length !== headerCells.length) {
                throw new Error(`Expected ${headerCells.length} cells, but got ${cells.length}`
                    + ` in the row '${rowLine}'. ${reviewMessage}`)
            }

            const kgpCell = cells[kgpColumn]
            assertNoUnsubstitutedVariable(kgpCell, rowLine)
            // A KGP cell is a single three-segment version ('2.3.10') or an en-dash span of them
            // ('2.3.20–2.3.21'). Only the span start matters: every entry built below extends up to the
            // next newer row start anyway.
            const kgpMatch = kgpCell.match(/^(\d+\.\d+\.\d+)(?:–(\d+\.\d+\.\d+))?$/)
            if (!kgpMatch) {
                throw new Error(`Unsupported '${kgpColumnName}' cell '${kgpCell}' in the row '${rowLine}'.`
                    + ` Supported formats: '<major.minor.patch>', '<major.minor.patch>–<major.minor.patch>'.`
                    + ` ${reviewMessage}`)
            }

            const gradleCell = cells[gradleColumn]
            assertNoUnsubstitutedVariable(gradleCell, rowLine)
            // A Gradle cell is an en-dash range, sometimes with a '*' footnote marker after the max
            // ('6.8.3–8.8*'). Gradle versions of the 8.x era and older may omit the patch part ('8.14'),
            // while 9+ versions are three-segment ('9.5.0').
            const gradleMatch = gradleCell.match(/^(\d+\.\d+(?:\.\d+)?)–(\d+\.\d+(?:\.\d+)?)\*?$/)
            if (!gradleMatch) {
                throw new Error(`Unsupported '${gradleColumnName}' cell '${gradleCell}' in the row '${rowLine}'.`
                    + ` Supported format: '<min version>–<max version>' with an optional trailing '*'.`
                    + ` ${reviewMessage}`)
            }

            // The Gradle max is widened to its whole 'major.minor' using the .9999 convention of
            // global-compatibilities.json: '9.3.0' and '8.14' both become '<major>.<minor>.9999'.
            rows.push({
                kgpRowStart: kgpMatch[1],
                gradleMin: gradleMatch[1],
                gradleMaxWidened: `${majorMinorOf(gradleMatch[2])}.9999`,
            })
            ++dataRowCount
            ++lineIndex
        }

        if (!dataRowCount) {
            throw new Error(`No data rows found in the table with the header row '${headerLine}'. ${reviewMessage}`)
        }
    }

    if (!tableCount) {
        throw new Error(`No tables with the '${kgpColumnName}' and '${gradleColumnName}' columns found.`
            + ` ${reviewMessage}`)
    }

    // The doc lists rows newest first, both within and across the two tables; the entry chaining
    // below relies on this order.
    for (let index = 1; index < rows.length; ++index) {
        if (compareVersions(rows[index].kgpRowStart, rows[index - 1].kgpRowStart) >= 0) {
            throw new Error(`KGP versions in the tables are not strictly descending:`
                + ` '${rows[index].kgpRowStart}' appears after '${rows[index - 1].kgpRowStart}'. ${reviewMessage}`)
        }
    }

    return rows
}


// Builds the compatibility entries by strict global chaining: newest first, each entry spans from its
// row start up to the next newer row start, so the entries tile the whole KGP version line without gaps.
function buildCompatibilityItems(rows: KgpCompatibilityRow[]): CompatibilityItem[] {
    // The top sentinel excludes KGP minors newer than the newest documented row from every Gradle version
    // (via an impossible Gradle range) until the docs cover them.
    const newestRowStart = rows[0].kgpRowStart
    const [newestMajor, newestMinor] = newestRowStart.split('.').map(Number)
    const topSentinelLowerBound = `${newestMajor}.${newestMinor + 1}`

    const dataEntries: { lowerBound: string, upperBound: string, gradleRange: string }[] = []
    let nextUpperBound = topSentinelLowerBound
    for (const row of rows) {
        const gradleRange = `[${row.gradleMin}, ${row.gradleMaxWidened})`
        const previousEntry = dataEntries[dataEntries.length - 1]
        if (previousEntry != null && previousEntry.gradleRange === gradleRange) {
            // Consecutive rows with an identical Gradle range collapse into one entry, even across KGP minors.
            previousEntry.lowerBound = row.kgpRowStart
        } else {
            dataEntries.push({ lowerBound: row.kgpRowStart, upperBound: nextUpperBound, gradleRange })
        }
        nextUpperBound = row.kgpRowStart
    }

    // A fixed literal key order keeps the serialized output stable.
    return [
        {
            versionRange: `[${topSentinelLowerBound}, )`,
            dependency: 'gradle-wrapper',
            dependencyVersionRange: '(9999, )',
        },
        ...dataEntries.map(entry => ({
            versionRange: `[${entry.lowerBound}, ${entry.upperBound})`,
            dependency: 'gradle-wrapper',
            dependencyVersionRange: entry.gradleRange,
        })),
        // The bottom sentinel excludes KGP versions older than the oldest documented row from every
        // Gradle version.
        {
            versionRange: `( , ${rows[rows.length - 1].kgpRowStart})`,
            dependency: 'gradle-wrapper',
            dependencyVersionRange: '( , 0)',
        },
    ]
}


const encoding = 'utf8'
const globalCompatibilitiesFile = 'global-compatibilities.json'
const kgpSectionKey = 'gradle-plugin:org.jetbrains.kotlin'
const content = fs.readFileSync(globalCompatibilitiesFile, encoding)
const json = JSON.parse(content)

// The script only regenerates an existing section, so a missing or empty one means a broken file.
const currentItems: CompatibilityItem[] = json.globalCompatibilities?.[kgpSectionKey]
if (!Array.isArray(currentItems) || !currentItems.length) {
    throw new Error(`'${kgpSectionKey}' of 'globalCompatibilities' in ${globalCompatibilitiesFile}`
        + ` must be a non-empty array`)
}

const docVariables = parseDocVariables(await fetchText(kotlinDocVariablesUrl))
const docContent = substituteDocVariables(normalizeSpaces(await fetchText(kgpCompatibilityDocUrl)), docVariables)
const rows = parseKgpCompatibilityTables(docContent)
const newItems = buildCompatibilityItems(rows)

// Shrink check: a KGP minor disappearing from the docs tables requires a human decision.
// Range changes for still documented minors are the normal case and go through.
const documentedMinors = new Set(rows.map(row => majorMinorOf(row.kgpRowStart)))
for (const currentItem of currentItems) {
    if (currentItem.dependencyVersionRange === '(9999, )') {
        continue // the top sentinel has no docs row by design
    }
    const lowerBoundMatch = currentItem.versionRange.match(/^[\[(]([^,]*),/)
    if (lowerBoundMatch == null) {
        throw new Error(`Cannot extract the lower bound of the version range '${currentItem.versionRange}'`
            + ` of '${kgpSectionKey}' in ${globalCompatibilitiesFile}. ${reviewMessage}`)
    }
    const lowerBound = lowerBoundMatch[1].trim()
    if (!lowerBound.length) {
        continue // the bottom sentinel '( , <oldest row start>)' has no docs row by design
    }
    if (!documentedMinors.has(majorMinorOf(lowerBound))) {
        throw new Error(`KGP ${majorMinorOf(lowerBound)} is present in ${globalCompatibilitiesFile}`
            + ` but not in the compatibility tables anymore. ${reviewMessage}`)
    }
}

// Assigning in place keeps the key order of the surrounding object.
json.globalCompatibilities[kgpSectionKey] = newItems

// validateConfig mutates its argument (it deletes $schema), so it gets a clone to keep the object
// that is serialized below intact.
validateConfig(structuredClone(json))

// global-compatibilities.json round-trips byte-identically through JSON.parse and this serialization,
// so comparing against the original content detects any real change.
const newContent = JSON.stringify(json, null, 2) + '\n'
if (newContent === content) {
    console.log(`${globalCompatibilitiesFile} is up-to-date`)
} else {
    const currentGradleRanges = new Map(currentItems.map(item => [item.versionRange, item.dependencyVersionRange]))
    const newKgpRanges = new Set(newItems.map(item => item.versionRange))
    for (const newItem of newItems) {
        const currentGradleRange = currentGradleRanges.get(newItem.versionRange)
        if (currentGradleRange == null) {
            console.log(`KGP ${newItem.versionRange}: added with Gradle range ${newItem.dependencyVersionRange}`)
        } else if (currentGradleRange !== newItem.dependencyVersionRange) {
            console.log(`KGP ${newItem.versionRange}:`
                + ` Gradle range changed from ${currentGradleRange} to ${newItem.dependencyVersionRange}`)
        }
    }
    for (const currentItem of currentItems) {
        if (!newKgpRanges.has(currentItem.versionRange)) {
            console.log(`KGP ${currentItem.versionRange}: removed`
                + ` (the Gradle range was ${currentItem.dependencyVersionRange})`)
        }
    }
    fs.writeFileSync(globalCompatibilitiesFile, newContent, encoding)
    console.log(`${globalCompatibilitiesFile} updated`)
}
