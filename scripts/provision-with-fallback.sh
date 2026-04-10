#!/usr/bin/env zsh
set -euo pipefail

ENV_NAME="${1:-dev}"
PREFERRED_REGIONS=(spaincentral switzerlandnorth polandcentral germanywestcentral swedencentral uaenorth)

if ! command -v azd >/dev/null 2>&1; then
  echo "azd CLI is required. Install from https://aka.ms/install-azd"
  exit 1
fi

if ! command -v az >/dev/null 2>&1; then
  echo "Azure CLI is required. Install from https://aka.ms/install-azure-cli"
  exit 1
fi

if [[ -d "/opt/homebrew/opt/node@22/bin" ]]; then
  export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@latest --activate
  else
    echo "pnpm is required but could not be auto-activated. Install Node 22 + corepack first."
    exit 1
  fi
fi

SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
if [[ -z "$SUBSCRIPTION_ID" ]]; then
  echo "Unable to resolve active Azure subscription. Run 'az login' first."
  exit 1
fi

if ! azd env list | awk '{print $1}' | grep -qx "$ENV_NAME"; then
  azd env new "$ENV_NAME" --no-prompt
else
  azd env select "$ENV_NAME"
fi

azd env set AZURE_SUBSCRIPTION_ID "$SUBSCRIPTION_ID"

# Use region restriction policy if present to avoid unsupported locations.
ALLOWED_JSON="$(az policy assignment list --scope "/subscriptions/$SUBSCRIPTION_ID" --query "[?name=='sys.regionrestriction'].parameters.listOfAllowedLocations.value | [0]" -o json 2>/dev/null || echo null)"

typeset -a CANDIDATES
if [[ "$ALLOWED_JSON" != "null" && "$ALLOWED_JSON" != "" ]]; then
  for region in $PREFERRED_REGIONS; do
    if echo "$ALLOWED_JSON" | grep -q "\"$region\""; then
      CANDIDATES+=("$region")
    fi
  done
else
  CANDIDATES=("${PREFERRED_REGIONS[@]}")
fi

if [[ ${#CANDIDATES[@]} -eq 0 ]]; then
  echo "No allowed regions found from policy and no fallback available."
  exit 1
fi

echo "Trying regions for env '$ENV_NAME': ${CANDIDATES[*]}"

for region in "${CANDIDATES[@]}"; do
  case "$region" in
    spaincentral) suffix="es" ;;
    switzerlandnorth) suffix="ch" ;;
    polandcentral) suffix="pl" ;;
    germanywestcentral) suffix="de" ;;
    swedencentral) suffix="se" ;;
    uaenorth) suffix="ae" ;;
    *) suffix="alt" ;;
  esac

  resource_group="todo-on-azure-${ENV_NAME}-${suffix}"

  azd env set AZURE_LOCATION "$region"
  azd env set AZURE_RESOURCE_GROUP "$resource_group"

  echo "Previewing in region '$region' (resource group: $resource_group)..."
  if azd provision --preview --no-prompt >/tmp/azd-preview-${ENV_NAME}.log 2>&1; then
    cat /tmp/azd-preview-${ENV_NAME}.log
    echo "Provisioning in region '$region'..."
    azd provision --no-prompt
    echo "Provisioning succeeded in region '$region'."
    exit 0
  fi

  echo "Provisioning preview failed in '$region'. Trying next region..."
  tail -n 25 /tmp/azd-preview-${ENV_NAME}.log || true
  echo
done

echo "Provisioning failed for all candidate regions: ${CANDIDATES[*]}"
exit 1
