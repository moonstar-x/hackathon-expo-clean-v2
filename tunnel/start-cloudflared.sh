#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    printf 'Error: .env file not found at %s\n' "$ENV_FILE" >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    printf 'Error: Docker is not installed or is not on PATH.\n' >&2
    exit 1
fi

# Read only the token; never execute .env as shell code.
TUNNEL_TOKEN="$(awk '
    /^[[:space:]]*(export[[:space:]]+)?CLOUDFLARE_TOKEN[[:space:]]*=/ {
        sub(/^[[:space:]]*(export[[:space:]]+)?CLOUDFLARE_TOKEN[[:space:]]*=[[:space:]]*/, "")
        sub(/[[:space:]]+#.*/, "")
        sub(/[[:space:]\r]+$/, "")
        if ($0 ~ /^".*"$/ || $0 ~ /^\047.*\047$/) {
            $0 = substr($0, 2, length($0) - 2)
        }
        token = $0
    }
    END { print token }
' "$ENV_FILE")"

if [[ -z "$TUNNEL_TOKEN" ]]; then
    printf 'Error: CLOUDFLARE_TOKEN must be set to a non-empty tunnel token in .env.\n' >&2
    exit 1
fi

# Pass the token through the environment rather than command-line arguments.
export TUNNEL_TOKEN

# Attached mode is Docker's default; exec forwards signals and exit status.
exec docker run --rm \
    --env TUNNEL_TOKEN \
    --network host \
    cloudflare/cloudflared:latest \
    tunnel --no-autoupdate run
