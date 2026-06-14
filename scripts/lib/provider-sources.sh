#!/usr/bin/env bash

provider_sources_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd
}

default_provider_sources() {
  (
    cd "$(provider_sources_root)"
    bun -e "import { newsProviderNames } from './src/providers'; console.log(newsProviderNames().join(','));"
  )
}

provider_sources_sql_in() {
  local sources="${1:-}"
  (
    cd "$(provider_sources_root)"
    SOURCES_LIST="$sources" bun -e "
      import { parseSourceNames, sourceNamesSqlIn } from './src/providers';
      console.log(sourceNamesSqlIn(parseSourceNames(process.env.SOURCES_LIST || undefined)));
    "
  )
}

provider_name_by_id() {
  local id="${1:?provider id required}"
  (
    cd "$(provider_sources_root)"
    bun -e "import { providerById } from './src/providers'; const provider = providerById('$id'); if (!provider) process.exit(1); console.log(provider.name);"
  )
}

provider_sources_lines() {
  local sources="${1:-}"
  (
    cd "$(provider_sources_root)"
    SOURCES_LIST="$sources" bun -e "
      import { parseSourceNames } from './src/providers';
      for (const name of parseSourceNames(process.env.SOURCES_LIST || undefined)) {
        console.log(name);
      }
    "
  )
}

provider_sources_union_sql() {
  local sources="${1:-}"
  (
    cd "$(provider_sources_root)"
    SOURCES_LIST="$sources" bun -e "
      import { parseSourceNames } from './src/providers';
      const names = parseSourceNames(process.env.SOURCES_LIST || undefined);
      console.log(
        names
          .map((name) => \"SELECT '\" + name.replace(/'/g, \"''\") + \"' AS source\")
          .join(' UNION ALL '),
      );
    "
  )
}
