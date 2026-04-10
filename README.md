# Todo on Azure

Application Todo MVP basee sur Next.js + shadcn/ui avec une architecture cible Azure:

- App Service for Containers (runtime)
- Azure Container Registry (image Docker)
- Cosmos DB (stockage des taches)
- Azure Blob Storage (pieces jointes)
- Azure Key Vault (secrets)
- Managed Identity (acces Key Vault et Blob)

## Avancement de l'implementation

Date de mise a jour: 2026-04-10

- [x] Initialisation Next.js TypeScript (App Router)
- [x] Integration shadcn/ui (button, input, textarea, card, checkbox, label, badge, separator)
- [x] Couches serveur: config, Key Vault, Cosmos DB, Blob Storage
- [x] API Routes: health, todos CRUD, attachment upload/delete
- [x] UI Todo: creation, listing, statut, suppression, piece jointe
- [x] Containerisation de base (Dockerfile multi-stage + output standalone)
- [x] Infrastructure Bicep + azure.yaml (squelette complet)
- [x] CI/CD GitHub Actions vers ACR + App Service (pipeline de base)
- [x] Provisioning Azure reel (env `ch`, region `polandcentral`)
- [x] Deploiement conteneur vers ACR et App Service

## Commandes principales executees

Les commandes ci-dessous ont ete executees pour demarrer l'implementation:

```bash
brew install node@22

export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
corepack enable
corepack prepare pnpm@latest --activate

pnpm create next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-pnpm --yes
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add input textarea card checkbox label badge separator

pnpm add @azure/cosmos @azure/identity @azure/keyvault-secrets @azure/storage-blob zod uuid date-fns
pnpm remove @types/uuid

pnpm lint
pnpm exec tsc --noEmit

az bicep install
az bicep build --file infra/main.bicep --stdout > /tmp/todo-on-azure-main.json

az policy assignment list --scope /subscriptions/<subscription-id> --query "[?name=='sys.regionrestriction'].parameters.listOfAllowedLocations.value | [0]"

azd env new ch --no-prompt
azd env set AZURE_LOCATION polandcentral
azd env set AZURE_RESOURCE_GROUP todo-on-azure-pl
azd provision --preview --no-prompt
azd provision --no-prompt

az acr login --name <acr-name>
docker build --platform linux/amd64 -t <acr-login-server>/todo-on-azure:<tag> -t <acr-login-server>/todo-on-azure:latest .
docker push <acr-login-server>/todo-on-azure:<tag>
docker push <acr-login-server>/todo-on-azure:latest

az webapp config container set \
	--resource-group <resource-group> \
	--name <webapp-name> \
	--container-image-name <acr-login-server>/todo-on-azure:<tag> \
	--container-registry-url https://<acr-login-server>
az webapp restart --resource-group <resource-group> --name <webapp-name>

curl -i https://<webapp-name>.azurewebsites.net/api/health
```

## Commandes principales Azure (a executer)

Les commandes suivantes sont pretes pour la phase de provisioning/deploiement:

```bash
# 1) Initialiser azd dans le projet
azd init

# 2) Creer un environnement
azd env new dev

# 3) Renseigner la region (choix principal)
azd env set AZURE_LOCATION spaincentral

# 3b) Fallback (selon policy subscription)
# exemple valide sur Azure for Students: polandcentral
azd env set AZURE_LOCATION polandcentral

# 4) Previsualiser le provisioning
azd provision --preview

# 5) Provisionner l'infrastructure
azd provision

# 6) Builder et pousser l'image sur ACR (App Service Linux => amd64)
az acr login --name <acr-name>
docker build --platform linux/amd64 -t <acr-name>.azurecr.io/todo-on-azure:<tag> .
docker push <acr-name>.azurecr.io/todo-on-azure:<tag>

# 7) Pointer App Service vers l'image ACR
az webapp config container set \
  --resource-group <resource-group> \
  --name <webapp-name> \
  --container-image-name <acr-name>.azurecr.io/todo-on-azure:<tag> \
  --container-registry-url https://<acr-name>.azurecr.io
```

Pour automatiser le fallback region:

```bash
./scripts/provision-with-fallback.sh dev
```

Ce script tente d'abord `spaincentral`, puis applique des regions de secours compatibles policy (par exemple `polandcentral`).

Note: sur cette subscription, une policy `Allowed resource deployment regions` autorise uniquement:

- `uaenorth`
- `polandcentral`
- `germanywestcentral`
- `swedencentral`
- `spaincentral`

`switzerlandnorth` est bloquee par policy dans ce contexte.

## Etat Azure actuel

- Environnement azd: `ch`
- Resource Group: `todo-on-azure-pl`
- Region: `polandcentral`
- Web App: `todoazure-ch-web-fw653m`
- URL: `https://todoazure-ch-web-fw653m.azurewebsites.net`
- Healthcheck: `GET /api/health` retourne `200`
- Smoke test API: `GET /api/todos` retourne `200`, create/delete valide

## Lancer le projet en local

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
pnpm install
cp .env.example .env.local
pnpm dev
```

Application disponible sur http://localhost:3000

## Variables d'environnement

Les variables de depart sont dans `.env.example`.

Variables critiques:

- `COSMOS_DB_ENDPOINT`
- `COSMOS_DB_KEY`
- `COSMOS_DB_DATABASE`
- `COSMOS_DB_CONTAINER`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_CONNECTION_STRING` (optionnel en cloud si Managed Identity)
- `AZURE_STORAGE_CONTAINER_NAME`
- `AZURE_KEY_VAULT_URL`

Note: en Azure, les secrets doivent etre stockes dans Key Vault et resolves via `DefaultAzureCredential`.

## Endpoints API disponibles

- `GET /api/health`
- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`
- `POST /api/todos/:id/attachment`
- `DELETE /api/todos/:id/attachment`

## Build conteneur

```bash
docker build -t todo-on-azure:local .
docker run --rm -p 3000:3000 --env-file .env.local todo-on-azure:local
```

## Prochaines etapes

1. Configurer les secrets GitHub Actions (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RESOURCE_GROUP`, `AZURE_ACR_NAME`, `AZURE_WEBAPP_NAME`).
2. Ajouter un test e2e minimal de piece jointe (upload + retrait) sur l'app deployee.
3. Eventuellement nettoyer les ressources partielles en Spain (`todo-on-azure`) pour eviter les couts inutiles.
