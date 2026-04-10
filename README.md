# Todo on Azure

Application Todo full-stack en Next.js, deployee sur Azure App Service (container), avec persistance Cosmos DB et pieces jointes sur Blob Storage.

## Fonctionnalites

- CRUD des taches
- Statuts enrichis: `todo`, `in_progress`, `blocked`, `done`
- Priorites: `low`, `medium`, `high`
- Filtres avances: recherche, statut, priorite, echeance, retard
- Tris avances: creation, mise a jour, echeance, priorite, statut, titre
- Piece jointe par tache (upload/suppression)

## Stack

- Frontend/API: Next.js 16 (App Router), React 19, TypeScript
- UI: shadcn/ui + Tailwind CSS
- Donnees: Azure Cosmos DB (SQL API, serverless)
- Fichiers: Azure Blob Storage
- Secrets: Azure Key Vault
- Runtime: Azure App Service for Containers
- Image: Azure Container Registry (ACR)

## Demarrage local

Prerequis:

- Node.js 22
- pnpm

Commandes:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
pnpm install
cp .env.example .env.local
pnpm dev
```

Application locale: http://localhost:3000

## Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner au minimum:

- `COSMOS_DB_ENDPOINT`
- `COSMOS_DB_KEY`
- `COSMOS_DB_DATABASE`
- `COSMOS_DB_CONTAINER`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_CONTAINER_NAME`

Optionnelles selon le contexte:

- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_KEY_VAULT_URL`

## Commandes utiles

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Deploiement Azure (azd + Bicep)

Le provisioning est defini dans `infra/` et orchestre via `azure.yaml`.

```bash
azd env new dev
azd env set AZURE_LOCATION polandcentral
azd provision --preview
azd provision
```

Script de fallback region (optionnel):

```bash
./scripts/provision-with-fallback.sh dev
```

Slot de deploiement development (optionnel):

- Utilite: valider une version en conditions cloud (config, secrets, connectivite) sans impacter la prod.
- Prerequis: plan App Service Standard/Premium (`S1` ou plus).
- Activation: dans `infra/main.parameters.json`, definir `appServicePlanSkuName` a `S1` (ou superieur) et `enableDevelopmentSlot` a `true`.
- Nom du slot: parametre `developmentSlotName` (par defaut `development`).
- CI/CD: definir le secret GitHub `AZURE_WEBAPP_SLOT_NAME` pour deployer le workflow vers ce slot.

## CI/CD GitHub Actions

Workflow: `.github/workflows/ci-cd.yml`

- Job `quality`: install, lint, typecheck, build
- Job `deploy`: sur push `main`, login Azure via OIDC, build/push image ACR, update Web App

Secrets GitHub requis:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- `AZURE_ACR_NAME`
- `AZURE_WEBAPP_NAME`
- `AZURE_WEBAPP_SLOT_NAME` (optionnel, pour deployer sur slot)

## API

- `GET /api/health`
- `GET /api/todos`
- `POST /api/todos`
- `PATCH /api/todos/:id`
- `DELETE /api/todos/:id`
- `POST /api/todos/:id/attachment`
- `DELETE /api/todos/:id/attachment`

## Documentation

- Architecture complete: `ARCHITECTURE.MD`
