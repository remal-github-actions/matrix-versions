import { MatrixItem } from './config'

export type NonNullable<T> = Exclude<T, null | undefined>

export type VersionOnlyFilter = NonNullable<MatrixItem['only']>
