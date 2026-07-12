process.env.RENOVATE_X_IGNORE_RE2 = 'true'


import * as fs from 'fs'
import { setTimeout as sleep } from 'timers/promises'
import { validateConfig } from './src/internal/config-functions.js'
import { CompatibilityItem } from './src/internal/config.js'
import { normalizeSpaces, substringBefore } from './src/internal/utils.js'


const gradleCompatibilityDocUrl = 'https://raw.githubusercontent.com/gradle/gradle/master'
    + '/platforms/documentation/docs/src/docs/userguide/releases/compatibility.adoc'

const reviewMessage = `Review ${gradleCompatibilityDocUrl} and update compatibilities-update-gradle-wrapper.ts`


class RetriableFetchError extends Error {
}

async function fetchGradleCompatibilityDocOnce(): Promise<string> {
    let response: Response
    try {
        response = await fetch(gradleCompatibilityDocUrl, { signal: AbortSignal.timeout(30_000) })
        if (response.ok) {
            return await response.text()
        }
    } catch (error) {
        throw new RetriableFetchError(`Fetching ${gradleCompatibilityDocUrl} failed: ${error}`)
    }

    if (response.status === 429 || response.status >= 500) {
        throw new RetriableFetchError(`Fetching ${gradleCompatibilityDocUrl} failed with status ${response.status}`)
    }

    if (response.status === 404) {
        throw new Error(`Fetching ${gradleCompatibilityDocUrl} failed with status 404.`
            + ` The file was moved in the gradle/gradle repository:`
            + ` find its new location and update gradleCompatibilityDocUrl in compatibilities-update-gradle-wrapper.ts`)
    }
    throw new Error(`Fetching ${gradleCompatibilityDocUrl} failed with status ${response.status}. ${reviewMessage}`)
}

async function fetchGradleCompatibilityDoc(): Promise<string> {
    const maxAttempts = 3
    for (let attempt = 1; ; ++attempt) {
        try {
            return await fetchGradleCompatibilityDocOnce()
        } catch (error) {
            if (!(error instanceof RetriableFetchError) || attempt >= maxAttempts) {
                throw error
            }
            console.warn(`${error.message} (attempt ${attempt} of ${maxAttempts}), retrying in 5 seconds`)
            await sleep(5_000)
        }
    }
}


function parseJavaCompatibilityTable(docContent: string): CompatibilityItem[] {
    const lines = normalizeSpaces(docContent).split('\n')

    function nextNonEmptyLineIndex(fromIndex: number): number {
        let index = fromIndex
        while (index < lines.length && !lines[index].trim().length) {
            ++index
        }
        return index
    }

    const captionIndex = lines.findIndex(line => line.trim() === '.Java Compatibility')
    if (captionIndex < 0) {
        throw new Error(`'.Java Compatibility' table caption not found. ${reviewMessage}`)
    }

    const tableStartIndex = nextNonEmptyLineIndex(captionIndex + 1)
    const tableStartLine = lines[tableStartIndex]
    if (tableStartLine?.trim() !== '|===') {
        throw new Error(`Expected '|===' after the '.Java Compatibility' caption,`
            + ` got '${tableStartLine ?? '<end of file>'}'. ${reviewMessage}`)
    }

    function splitCells(line: string): string[] {
        return line.split('|').slice(1).map(cell => cell.trim())
    }

    const headerIndex = nextNonEmptyLineIndex(tableStartIndex + 1)
    const headerLine = lines[headerIndex]
    if (headerLine == null || !headerLine.startsWith('|')) {
        throw new Error(`Expected a '.Java Compatibility' table header row starting with '|',`
            + ` got '${headerLine ?? '<end of file>'}'. ${reviewMessage}`)
    }
    const headerCells = splitCells(headerLine)
    const javaVersionColumn = headerCells.indexOf('Java version')
    if (javaVersionColumn < 0) {
        throw new Error(`'Java version' column not found in the header row '${headerLine}'. ${reviewMessage}`)
    }
    const runningGradleColumn = headerCells.indexOf('Support for running Gradle')
    if (runningGradleColumn < 0) {
        throw new Error(`'Support for running Gradle' column not found in the header row '${headerLine}'.`
            + ` ${reviewMessage}`)
    }

    const gradleRangeByJavaVersion = new Map<number, string>()
    for (let index = headerIndex + 1; ; ++index) {
        const line = lines[index]
        if (line == null) {
            throw new Error(`The '.Java Compatibility' table is not closed with '|==='. ${reviewMessage}`)
        }
        if (line.trim() === '|===') {
            break
        }
        if (!line.trim().length) {
            continue
        }
        if (!line.startsWith('|')) {
            throw new Error(`Expected a '.Java Compatibility' table row starting with '|', got '${line}'.`
                + ` ${reviewMessage}`)
        }

        const cells = splitCells(line)
        if (cells.length !== headerCells.length) {
            throw new Error(`Expected ${headerCells.length} cells, but got ${cells.length} in the row '${line}'.`
                + ` ${reviewMessage}`)
        }

        const javaVersionCell = cells[javaVersionColumn]
        if (!javaVersionCell.match(/^\d+$/)) {
            throw new Error(`Unsupported 'Java version' cell '${javaVersionCell}' in the row '${line}'.`
                + ` ${reviewMessage}`)
        }
        const javaVersion = Number(javaVersionCell)
        if (gradleRangeByJavaVersion.has(javaVersion)) {
            throw new Error(`Duplicate Java version in the row '${line}'. ${reviewMessage}`)
        }

        const runningGradleCell = cells[runningGradleColumn]
        const sinceMatch = runningGradleCell.match(/^(\d+(?:\.\d+)*) and after$/)
        const rangeMatch = runningGradleCell.match(/^(\d+(?:\.\d+)*) to (\d+(?:\.\d+)*)\.x$/)
        if (sinceMatch) {
            gradleRangeByJavaVersion.set(javaVersion, `[${sinceMatch[1]}, )`)
        } else if (rangeMatch) {
            gradleRangeByJavaVersion.set(javaVersion, `[${rangeMatch[1]}, ${substringBefore(rangeMatch[2], '.')}.9999)`)
        } else {
            throw new Error(`Unsupported 'Support for running Gradle' cell '${runningGradleCell}' in the row '${line}'.`
                + ` Supported formats: '<version> and after', '<version> to <version>.x'. ${reviewMessage}`)
        }
    }

    if (!gradleRangeByJavaVersion.size) {
        throw new Error(`No rows found in the '.Java Compatibility' table. ${reviewMessage}`)
    }

    return [...gradleRangeByJavaVersion.entries()]
        .toSorted(([javaVersion1], [javaVersion2]) => javaVersion2 - javaVersion1)
        .map(([javaVersion, gradleRange]) => ({
            versionRange: gradleRange,
            dependency: 'java',
            dependencyVersionRange: javaVersion.toString(),
        }))
}


const encoding = 'utf8'
const globalCompatibilitiesFile = 'global-compatibilities.json'
const content = fs.readFileSync(globalCompatibilitiesFile, encoding)
const json = JSON.parse(content)

const currentItems: CompatibilityItem[] = json.globalCompatibilities?.['gradle-wrapper']
if (!Array.isArray(currentItems) || !currentItems.length) {
    throw new Error(`'gradle-wrapper' of 'globalCompatibilities' in ${globalCompatibilitiesFile}`
        + ` must be a non-empty array`)
}

const newItems = parseJavaCompatibilityTable(await fetchGradleCompatibilityDoc())

const newJavaVersions = new Set(newItems.map(item => item.dependencyVersionRange))
for (const currentItem of currentItems) {
    if (!newJavaVersions.has(currentItem.dependencyVersionRange)) {
        throw new Error(`Java ${currentItem.dependencyVersionRange} is present in ${globalCompatibilitiesFile}`
            + ` but not in the '.Java Compatibility' table anymore. ${reviewMessage}`)
    }
}

json.globalCompatibilities['gradle-wrapper'] = newItems

validateConfig(structuredClone(json))

const newContent = JSON.stringify(json, null, 2) + '\n'
if (newContent === content) {
    console.log(`${globalCompatibilitiesFile} is up-to-date`)
} else {
    const currentGradleRanges = new Map(currentItems.map(item => [item.dependencyVersionRange, item.versionRange]))
    for (const newItem of newItems) {
        const currentGradleRange = currentGradleRanges.get(newItem.dependencyVersionRange)
        if (currentGradleRange == null) {
            console.log(`Java ${newItem.dependencyVersionRange}: added with Gradle range ${newItem.versionRange}`)
        } else if (currentGradleRange !== newItem.versionRange) {
            console.log(`Java ${newItem.dependencyVersionRange}:`
                + ` Gradle range changed from ${currentGradleRange} to ${newItem.versionRange}`)
        }
    }
    fs.writeFileSync(globalCompatibilitiesFile, newContent, encoding)
    console.log(`${globalCompatibilitiesFile} updated`)
}
