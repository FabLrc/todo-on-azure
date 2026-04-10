targetScope = 'resourceGroup'

@description('Azure location for all resources.')
param location string = resourceGroup().location

@description('Environment name, for example dev, test or prod.')
param environmentName string = 'dev'

@description('Prefix used to generate resource names.')
param namePrefix string = 'todoazure'

@description('Container repository name pushed to ACR.')
param imageName string = 'todo-on-azure'

@description('Container tag configured on the Web App at provision time.')
param imageTag string = 'latest'

@description('App Service plan SKU name. Default keeps costs lower for dev.')
param appServicePlanSkuName string = 'B1'

@description('ACR SKU name.')
param acrSkuName string = 'Basic'

@description('Cosmos DB SQL database name.')
param cosmosDatabaseName string = 'todoapp'

@description('Cosmos DB SQL container name.')
param cosmosContainerName string = 'todos'

@description('Application-level partition key value for Todo data.')
param cosmosPartitionKeyValue string = 'todo-app'

@description('Blob container name for task attachments.')
param storageContainerName string = 'todo-attachments'

@description('Enable Cosmos free tier when available.')
param enableCosmosFreeTier bool = false

var safePrefix = toLower(replace(namePrefix, '-', ''))
var uniqueSuffix = toLower(substring(uniqueString(subscription().subscriptionId, resourceGroup().id, environmentName), 0, 6))

var acrName = take('${safePrefix}${environmentName}${uniqueSuffix}acr', 50)
var storageAccountName = take('${safePrefix}${environmentName}${uniqueSuffix}st', 24)
var cosmosAccountName = take('${safePrefix}-${environmentName}-cosmos-${uniqueSuffix}', 44)
var keyVaultName = take('${safePrefix}-${environmentName}-kv-${uniqueSuffix}', 24)
var appServicePlanName = take('${safePrefix}-${environmentName}-plan', 40)
var webAppName = take('${safePrefix}-${environmentName}-web-${uniqueSuffix}', 60)

module acr './modules/acr.bicep' = {
  name: 'acrDeployment'
  params: {
    name: acrName
    location: location
    skuName: acrSkuName
  }
}

module storage './modules/storage.bicep' = {
  name: 'storageDeployment'
  params: {
    accountName: storageAccountName
    location: location
    containerName: storageContainerName
  }
}

module cosmos './modules/cosmos.bicep' = {
  name: 'cosmosDeployment'
  params: {
    accountName: cosmosAccountName
    location: location
    databaseName: cosmosDatabaseName
    containerName: cosmosContainerName
    partitionKeyPath: '/partitionKey'
    enableFreeTier: enableCosmosFreeTier
  }
}

module keyVault './modules/keyvault.bicep' = {
  name: 'keyVaultDeployment'
  params: {
    name: keyVaultName
    location: location
    tenantId: subscription().tenantId
    cosmosEndpoint: cosmos.outputs.endpoint
    cosmosKey: cosmos.outputs.primaryKey
    storageAccountName: storage.outputs.name
  }
}

module appService './modules/appservice.bicep' = {
  name: 'appServiceDeployment'
  params: {
    appServicePlanName: appServicePlanName
    webAppName: webAppName
    location: location
    appServicePlanSkuName: appServicePlanSkuName
    acrLoginServer: acr.outputs.loginServer
    imageName: imageName
    imageTag: imageTag
    keyVaultUrl: keyVault.outputs.vaultUri
    cosmosDatabaseName: cosmosDatabaseName
    cosmosContainerName: cosmosContainerName
    cosmosPartitionKeyValue: cosmosPartitionKeyValue
  }
}

resource acrExisting 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource keyVaultExisting 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource storageExisting 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

var acrPullRoleDefinitionId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var keyVaultSecretsUserRoleDefinitionId = '4633458b-17de-408a-b874-0445c86b69e6'
var storageBlobDataContributorRoleDefinitionId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acrName, webAppName, acrPullRoleDefinitionId)
  scope: acrExisting
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleDefinitionId)
    principalId: appService.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

resource keyVaultSecretsUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultName, webAppName, keyVaultSecretsUserRoleDefinitionId)
  scope: keyVaultExisting
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultSecretsUserRoleDefinitionId)
    principalId: appService.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

resource storageBlobDataContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccountName, webAppName, storageBlobDataContributorRoleDefinitionId)
  scope: storageExisting
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', storageBlobDataContributorRoleDefinitionId)
    principalId: appService.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

output webAppName string = appService.outputs.name
output webAppUrl string = 'https://${appService.outputs.defaultHostName}'
output webAppResourceId string = appService.outputs.id
output webAppPrincipalId string = appService.outputs.principalId

output acrName string = acr.outputs.name
output acrLoginServer string = acr.outputs.loginServer
output keyVaultName string = keyVault.outputs.name
output cosmosAccountName string = cosmos.outputs.name
output storageAccountName string = storage.outputs.name

output SERVICE_WEB_NAME string = appService.outputs.name
output SERVICE_WEB_RESOURCE_ID string = appService.outputs.id
output SERVICE_WEB_IDENTITY_PRINCIPAL_ID string = appService.outputs.principalId
output AZURE_CONTAINER_REGISTRY_NAME string = acr.outputs.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = acr.outputs.loginServer
