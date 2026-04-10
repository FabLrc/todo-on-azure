# Architecture Azure et CI/CD

Ce document decrit comment l'application Todo est deployee sur Azure, comment les ressources sont connectees, et comment la chaine CI/CD publie le conteneur.

## Vue d'ensemble

L'application est un conteneur Next.js execute sur Azure App Service (Linux). Elle stocke:

- Les taches dans Cosmos DB (SQL API)
- Les pieces jointes dans Blob Storage
- Les secrets techniques dans Key Vault

Le conteneur est construit et pousse dans Azure Container Registry (ACR), puis reference par la Web App.

## Architecture des ressources Azure

Les ressources sont provisionnees en Bicep depuis [infra/main.bicep](infra/main.bicep).

Modules:

- [infra/modules/acr.bicep](infra/modules/acr.bicep): registre d'images Docker
- [infra/modules/appservice.bicep](infra/modules/appservice.bicep): plan App Service + Web App Linux + identity system-assigned
- [infra/modules/cosmos.bicep](infra/modules/cosmos.bicep): compte Cosmos DB serverless + database + container
- [infra/modules/storage.bicep](infra/modules/storage.bicep): compte StorageV2 + container blob prive
- [infra/modules/keyvault.bicep](infra/modules/keyvault.bicep): coffre Key Vault + secrets applicatifs

Ressources principales et role:

- App Service Plan (Linux): heberge la Web App
- Web App Container: runtime de l'application
- ACR: stocke les images `todo-on-azure:<tag>`
- Cosmos DB: stocke les documents Todo
- Storage Account + Blob Container: stocke les fichiers attaches
- Key Vault: stocke `cosmos-endpoint`, `cosmos-key`, `storage-account-name`

## Identite et securite

La Web App utilise une managed identity system-assigned.

Role assignments crees dans [infra/main.bicep](infra/main.bicep):

- `AcrPull` sur ACR pour pull l'image
- `Key Vault Secrets User` sur Key Vault pour lire les secrets
- `Storage Blob Data Contributor` sur Storage pour gerer les blobs

Points de securite importants:

- `httpsOnly: true` sur la Web App
- TLS 1.2 minimum
- `acrUseManagedIdentityCreds: true`
- Key Vault en mode RBAC (`enableRbacAuthorization: true`)
- Storage sans blob public (`allowBlobPublicAccess: false`)

## Configuration applicative

La Web App recoit notamment ces app settings via Bicep:

- `AZURE_KEY_VAULT_URL`
- `KV_SECRET_COSMOS_ENDPOINT`
- `KV_SECRET_COSMOS_KEY`
- `KV_SECRET_STORAGE_ACCOUNT_NAME`
- `COSMOS_DB_DATABASE`
- `COSMOS_DB_CONTAINER`
- `COSMOS_PARTITION_KEY_VALUE`
- `WEBSITES_PORT=3000`

L'application lit les secrets via `DefaultAzureCredential` puis consomme Cosmos/Blob.

## Flux runtime

1. Un client HTTP appelle la Web App.
2. Les routes API Next.js executent la logique metier.
3. La couche serveur lit les secrets dans Key Vault via managed identity.
4. Les taches sont lues/ecrites dans Cosmos DB.
5. Les pieces jointes sont stockees/supprimees dans Blob Storage.

## CI/CD GitHub Actions

Le pipeline est defini dans [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml).

Jobs:

- `quality` (PR + push):
  - checkout
  - setup pnpm/node
  - `pnpm install --frozen-lockfile`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`
- `deploy` (push sur `main` uniquement):
  - login Azure via OIDC (`azure/login@v2`)
  - `az acr login`
  - build image Docker
  - push image taggee SHA + `latest`
  - update du conteneur de la Web App
  - restart de la Web App

## OIDC et secrets CI

Le job deploy utilise OIDC (pas de secret client Azure stocke).

Secrets GitHub requis:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `AZURE_ACR_NAME`
- `AZURE_WEBAPP_NAME`

Le service principal (ou managed identity federable) doit avoir des droits suffisants pour:

- push sur ACR
- update de config Web App
- restart Web App

## Provisioning et operations

Provisioning local standard:

```bash
azd env new dev
azd env set AZURE_LOCATION polandcentral
azd provision --preview
azd provision
```

Option fallback region:

```bash
./scripts/provision-with-fallback.sh dev
```

Verification minimale apres deploiement:

- `GET /api/health` doit retourner 200
- verifier que l'image ciblee par la Web App est bien en architecture `linux/amd64`
