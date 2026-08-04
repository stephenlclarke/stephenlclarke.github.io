#!/usr/bin/env bash
# Build the non-container Swift project DocC sites into one Pages subtree.

set -euo pipefail

if (( $# != 6 )); then
    printf 'usage: %s OUTPUT_PATH ASTEROIDS_PATH BZFLAG_SWIFT_PATH GALAXIANS_PATH MAC_SYNC_PATH MYTIMEBUDDY_PATH\n' "$0" >&2
    exit 2
fi

output_path="$1"
asteroids_path="$2"
bzflag_swift_path="$3"
galaxians_path="$4"
mac_sync_path="$5"
mytimebuddy_path="$6"
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

if [[ -z "$output_path" || "$output_path" == "/" ]]; then
    printf 'Refusing unsafe documentation output path: %s\n' "$output_path" >&2
    exit 2
fi

mkdir -p "$output_path"
output_path="$(cd "$output_path" && pwd -P)"
if [[ "$output_path" == "$repository_root" ]]; then
    printf 'Refusing unsafe documentation output path: %s\n' "$output_path" >&2
    exit 2
fi

rm -rf "$output_path"
mkdir -p "$output_path"

# Build one repository's site below its stable project path.
build_project_site() {
    local repository_path="$1"
    local site_name="$2"
    local site_path="$output_path/$site_name"
    local source_reference

    source_reference="$(git -C "$repository_path" rev-parse HEAD)"
    DOCS_SOURCE_REFERENCE="$source_reference" \
        "$repository_path/scripts/make-docs.sh" "$site_path" "projects/$site_name"

    if [[ ! -s "$site_path/index.html" || ! -s "$site_path/theme/project-icon.png" ]]; then
        printf 'Incomplete generated project documentation: %s\n' "$site_name" >&2
        exit 1
    fi
}

build_project_site "$asteroids_path" asteroids
build_project_site "$bzflag_swift_path" bzflag-swift
build_project_site "$galaxians_path" galaxians
build_project_site "$mac_sync_path" mac-sync
build_project_site "$mytimebuddy_path" mytimebuddy
