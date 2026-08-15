#!/usr/bin/env bash
# Build the container project family's DocC sites into one Pages subtree.

set -euo pipefail

if (( $# != 9 )); then
    printf 'usage: %s OUTPUT_PATH ENGINE_API_PATH CONTAINER_PATH CONTAINERIZATION_PATH CONTAINER_K8S_PATH BUILDER_SHIM_PATH CONTAINER_COMPOSE_PATH DEVCONTAINER_PATH SWIFT_NIO_SSL_PATH\n' "$0" >&2
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
swift_nio_ssl_path="$9"
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

# Publish compact landing-page icons from the README artwork owned by each repository.
copy_project_icon() {
    local source_path="$1"
    local icon_name="$2"
    local project_icons_path="$output_path/project-icons"

    mkdir -p "$project_icons_path"
    sips -Z 192 "$source_path" --out "$project_icons_path/$icon_name.png" >/dev/null
}

copy_project_icon "$engine_api_path/docs/images/container-engine-api-icon.png" container-engine-api
copy_project_icon "$container_path/assets/container-icon.png" container
copy_project_icon "$containerization_path/assets/containerization-icon.png" containerization
copy_project_icon "$container_k8s_path/docs/images/container-k8s-icon.png" container-k8s
copy_project_icon "$builder_shim_path/docs/images/container-builder-shim-icon.png" container-builder-shim
copy_project_icon "$container_compose_path/docs/images/container-compose-icon-octopus.png" container-compose
copy_project_icon "$devcontainer_path/docs/images/devcontainer-icon.png" devcontainer
cp "$repository_root/api/swift-nio-ssl-icon.svg" "$output_path/project-icons/swift-nio-ssl.svg"

# Apply the collection theme and a repository-specific header icon to one generated DocC site.
apply_docc_theme() {
    local site_path="$1"
    local site_name="$2"
    local header_icon_path="$3"
    local header_icon_name="$4"
    local replace_page_image="${5:-false}"
    local header_icon_url="/api/$site_name/theme/$header_icon_name"
    local stylesheet
    local stylesheets

    mkdir -p "$site_path/theme"
    cp "$header_icon_path" "$site_path/theme/$header_icon_name"

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

# Build one repository's documentation below its stable API path.
build_docc_site() {
    local repository_path="$1"
    local site_name="$2"
    local header_icon_path="$3"
    local replace_page_image="${4:-false}"
    local site_path="$output_path/$site_name"
    local source_reference

    source_reference="$(git -C "$repository_path" rev-parse HEAD)"
    mkdir -p "$site_path"
    (
        cd "$repository_path"
        DOCS_SOURCE_REFERENCE="$source_reference" \
            scripts/make-docs.sh "$site_path" "api/$site_name"
    )

    apply_docc_theme "$site_path" "$site_name" "$header_icon_path" header-icon.png "$replace_page_image"
}

# Build DocC directly from an Xcode package scheme when the source repository has no DocC command plugin.
build_xcode_docc_site() {
    local repository_path="$1"
    local site_name="$2"
    local scheme_name="$3"
    local archive_name="$4"
    local site_path="$output_path/$site_name"
    local scratch_parent="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
    local build_root
    local archive_path

    build_root="$(mktemp -d "$scratch_parent/container-api-docs-$site_name.XXXXXX")"
    (
        cd "$repository_path"
        xcodebuild \
            -quiet \
            -scheme "$scheme_name" \
            -configuration Debug \
            -destination 'generic/platform=macOS' \
            -derivedDataPath "$build_root/DerivedData" \
            docbuild \
            CODE_SIGNING_ALLOWED=NO
    )

    archive_path="$build_root/DerivedData/Build/Products/Debug/$archive_name.doccarchive"
    if [[ ! -d "$archive_path" ]]; then
        printf 'Unable to find the DocC archive for %s at %s\n' "$site_name" "$archive_path" >&2
        exit 1
    fi

    xcrun docc process-archive transform-for-static-hosting \
        "$archive_path" \
        --output-path "$site_path" \
        --hosting-base-path "/api/$site_name"

    printf '{}\n' > "$site_path/theme-settings.json"
    cat > "$site_path/index.html" <<'EOF'
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8">
    <title>SwiftNIO SSL documentation</title>
    <meta http-equiv="refresh" content="0; url=./documentation/niossl/">
  </head>
  <body>
    <p>If you are not redirected automatically, <a href="./documentation/niossl/">open the SwiftNIO SSL documentation</a>.</p>
  </body>
</html>
EOF

    apply_docc_theme \
        "$site_path" \
        "$site_name" \
        "$repository_root/api/swift-nio-ssl-icon.svg" \
        header-icon.svg \
        true
    rm -rf "$build_root"
}

build_docc_site \
    "$engine_api_path" \
    container-engine-api \
    "$engine_api_path/docs/images/container-engine-api-docc-header.png" \
    true
build_docc_site "$container_path" container "$container_path/assets/container-docc-header.png"
build_docc_site \
    "$containerization_path" \
    containerization \
    "$containerization_path/assets/containerization-docc-header.png"
build_docc_site \
    "$container_k8s_path" \
    container-k8s \
    "$container_k8s_path/docs/images/container-k8s-docc-header.png" \
    true
build_docc_site \
    "$builder_shim_path" \
    container-builder-shim \
    "$builder_shim_path/docs/images/container-builder-shim-docc-header.png" \
    true
build_docc_site \
    "$container_compose_path" \
    container-compose \
    "$container_compose_path/docs/images/container-compose-docc-card.png"
build_docc_site \
    "$devcontainer_path" \
    devcontainer \
    "$devcontainer_path/docs/images/devcontainer-docc-header.png" \
    true
build_xcode_docc_site "$swift_nio_ssl_path" swift-nio-ssl NIOSSL NIOSSL
