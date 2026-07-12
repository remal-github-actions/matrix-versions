import type { Release } from 'renovate/dist/modules/datasource/types.js'

export type RenovateReleaseFilter = (release: Release) => boolean
