import type { CollectionConfig, DataSourceAdapter } from './types'
import { sqlJsonbAdapter } from './sql-jsonb'
import { storageManifestAdapter } from './storage-manifest'
import { sqlColumnsAdapter } from './sql-columns'

// Resolve the adapter for a collection's store type.
export function adapterFor(cfg: CollectionConfig): DataSourceAdapter {
  switch (cfg.store) {
    case 'sql_jsonb':
      return sqlJsonbAdapter
    case 'storage_manifest':
      return storageManifestAdapter
    case 'sql_columns':
      return sqlColumnsAdapter
    default:
      throw new Error(`no adapter for store '${cfg.store}'`)
  }
}
