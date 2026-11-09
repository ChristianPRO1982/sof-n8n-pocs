#!/usr/bin/env bash
# Run explicitly on the development machine, after the local KM checks.
set -euo pipefail

valid_version() {
  [[ $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9][A-Za-z0-9.-]*)?$ && ${#1} -le 128 ]]
}

if [[ $# -gt 1 ]] || { [[ $# -eq 1 ]] && ! valid_version "$1"; }; then
  echo "Usage: $0 [VERSION] (exemple : 0.5.0 ; sans argument : incrément du dernier nombre de KM_VERSION)" >&2
  exit 2
fi

repository=christianpro1982/km
project_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
config_file="$project_root/UI_chat/km/config.ini"
if [[ ! -f $config_file || ! -r $config_file || ! -w $config_file ]]; then
  echo "Configuration KM absente, illisible ou non modifiable : $config_file" >&2
  exit 1
fi

if [[ $# -eq 1 ]]; then
  version=$1
else
  version=$(awk '/^[[:space:]]*KM_VERSION[[:space:]]*=/ {
    sub(/^[^=]*=[[:space:]]*/, ""); sub(/[[:space:]]*$/, ""); print
  }' "$config_file")
  if ! valid_version "$version"; then
    echo "KM_VERSION absente, invalide ou dupliquée. Fournir une version explicite." >&2
    exit 2
  fi
  IFS=. read -r major minor patch <<< "${version%%-*}"
  # Increment decimal digits without octal interpretation or integer overflow.
  while [[ ${#patch} -gt 1 && $patch == 0* ]]; do patch=${patch:1}; done
  carry=1
  for ((index=${#patch}-1; index>=0; index--)); do
    digit=${patch:index:1}
    if [[ $digit == 9 ]]; then
      patch="${patch:0:index}0${patch:index+1}"
    else
      patch="${patch:0:index}$((10#$digit + 1))${patch:index+1}"
      carry=0
      break
    fi
  done
  if [[ $carry -eq 1 ]]; then patch="1$patch"; fi
  version="$major.$minor.$patch"
  if ! valid_version "$version"; then
    echo "La version incrémentée dépasse la longueur autorisée. Fournir une version explicite." >&2
    exit 2
  fi
fi

config_update=$(mktemp)
inspection=''
trap 'rm -f -- "$config_update"; if [[ -n $inspection ]]; then rm -f -- "$inspection"; fi' EXIT
awk -v version="$version" 'BEGIN { print "KM_VERSION=" version }
  !/^[[:space:]]*KM_VERSION[[:space:]]*=/' "$config_file" > "$config_update"
# Preserve the inode so existing Docker bind mounts see the update.
if ! cat -- "$config_update" > "$config_file"; then
  echo "Impossible d’enregistrer KM_VERSION ; publication arrêtée avant Docker." >&2
  exit 1
fi
printf 'Version KM enregistrée : %s\n' "$version"

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
