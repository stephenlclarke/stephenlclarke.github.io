#!/usr/bin/env bash
# Build the container project family's DocC sites into one Pages subtree.

set -euo pipefail

if (( $# != 8 )); then
    printf 'usage: %s OUTPUT_PATH ENGINE_API_PATH CONTAINER_PATH CONTAINERIZATION_PATH CONTAINER_K8S_PATH BUILDER_SHIM_PATH CONTAINER_COMPOSE_PATH DEVCONTAINER_PATH\n' "$0" >&2
    exit 2
fi

output_path="$1"
engine_api_path="$2"
container_path="$3"
containerization_path="$4"
container_k8s_path="$5"
builder_shim_path="$6"
container_compose_path="$7"
devcontainer_path="$8"
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
docc_theme_path="$repository_root/api/docc-theme.css"

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
cp "$repository_root/api/index.html" "$output_path/index.html"

# Build one repository's documentation below its stable API path.
build_docc_site() {
    local repository_path="$1"
    local site_name="$2"
    local header_icon_path="$3"
    local replace_page_image="${4:-false}"
    local site_path="$output_path/$site_name"
    local header_icon_url="/api/$site_name/theme/header-icon.png"
    local source_reference
    local stylesheet
    local stylesheets

    source_reference="$(git -C "$repository_path" rev-parse HEAD)"
    mkdir -p "$site_path"
    (
        cd "$repository_path"
        DOCS_SOURCE_REFERENCE="$source_reference" \
            scripts/make-docs.sh "$site_path" "api/$site_name"
    )

    mkdir -p "$site_path/theme"
    cp "$header_icon_path" "$site_path/theme/header-icon.png"

    stylesheets=("$site_path"/css/documentation-topic.*.css)
    if [[ ! -e "${stylesheets[0]}" ]]; then
        printf 'Unable to find the DocC topic stylesheet for %s\n' "$site_name" >&2
        exit 1
    fi

    for stylesheet in "${stylesheets[@]}"; do
        printf '\n' >> "$stylesheet"
        sed "s|__CONTAINER_API_HEADER_ICON_URL__|$header_icon_url|g" "$docc_theme_path" >> "$stylesheet"

        if [[ "$replace_page_image" == true ]]; then
            printf '\n.documentation-hero .background-icon img { content: url("%s"); }\n' \
                "$header_icon_url" >> "$stylesheet"
        fi
    done
}

standard_header_icon="$container_path/assets/Containerization-Logo.png"

build_docc_site "$engine_api_path" container-engine-api "$standard_header_icon"
build_docc_site "$container_path" container "$standard_header_icon"
build_docc_site "$containerization_path" containerization "$standard_header_icon"
build_docc_site "$container_k8s_path" container-k8s "$repository_root/api/theme/container-k8s-header.png" true
build_docc_site "$builder_shim_path" container-builder-shim "$standard_header_icon"
build_docc_site \
    "$container_compose_path" \
    container-compose \
    "$container_compose_path/Sources/ComposeCore/ComposeCore.docc/Resources/container-compose-docc-card.png"
build_docc_site "$devcontainer_path" devcontainer "$repository_root/api/theme/devcontainer-header.png" true
