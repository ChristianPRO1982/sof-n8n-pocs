#!/usr/bin/env bash
# Run explicitly on the development machine, after the local KM checks.
set -euo pipefail

if [[ $# -ne 1 || ! $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9][A-Za-z0-9.-]*)?$ || ${#1} -gt 128 ]]; then
  echo "Usage: $0 VERSION (exemple : 0.1.0 ; ne pas utiliser latest)" >&2
  exit 2
fi

version=$1
repository=christianpro1982/km
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
command -v docker >/dev/null || { echo "Docker est requis." >&2; exit 1; }
docker buildx version >/dev/null
# A dedicated container builder supports both target architectures.
builder_info=$(docker buildx inspect --bootstrap)
driver=$(printf '%s\n' "$builder_info" | awk '$1 == "Driver:" { print $2; exit }')
if [[ $driver != docker-container ]]; then
  echo "Sélectionner un builder docker-container : docker buildx create --name km-publisher --driver docker-container --use" >&2
  exit 1
fi

inspection=$(mktemp)
trap 'rm -f -- "$inspection"' EXIT
if docker buildx imagetools inspect "$repository:$version" >"$inspection" 2>&1; then
  echo "Publication refusée : $repository:$version existe déjà. Choisir une nouvelle version." >&2
  exit 1
elif grep -Eqi 'unauthorized|denied|forbidden|insufficient_scope' "$inspection" ||
     ! grep -Eqi 'manifest unknown|not found' "$inspection"; then
  cat "$inspection" >&2
  echo "Impossible de vérifier la disponibilité du tag. Vérifier docker login et la connexion avant de réessayer." >&2
  exit 1
fi

printf 'Publication de %s:%s et %s:latest (amd64 + arm64)\n' "$repository" "$version" "$repository"
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file "$project_root/Dockerfile.km_front" \
  --tag "$repository:$version" \
  --tag "$repository:latest" \
  --push "$project_root"
