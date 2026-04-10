@description('App Service Plan name.')
param appServicePlanName string

@description('Web App name.')
param webAppName string

@description('Azure region for App Service resources.')
param location string

@description('App Service Plan SKU name, for example B1, S1 or P1v3.')
param appServicePlanSkuName string = 'B1'

@description('ACR login server in the form <name>.azurecr.io.')
param acrLoginServer string

@description('Container image repository name.')
param imageName string = 'todo-on-azure'

@description('Container image tag.')
param imageTag string = 'latest'

@description('Key Vault URI used by the application.')
param keyVaultUrl string

@description('Cosmos DB database name used by the app.')
param cosmosDatabaseName string

@description('Cosmos DB container name used by the app.')
param cosmosContainerName string

@description('Partition key value used for Todo documents.')
param cosmosPartitionKeyValue string = 'todo-app'

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: appServicePlanSkuName
    tier: contains(['B1', 'B2', 'B3'], appServicePlanSkuName) ? 'Basic' : contains(['S1', 'S2', 'S3'], appServicePlanSkuName) ? 'Standard' : 'PremiumV3'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acrLoginServer}/${imageName}:${imageTag}'
      minTlsVersion: '1.2'
      healthCheckPath: '/api/health'
      alwaysOn: true
      http20Enabled: true
      acrUseManagedIdentityCreds: true
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '3000'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'AZURE_KEY_VAULT_URL'
          value: keyVaultUrl
        }
        {
          name: 'KV_SECRET_COSMOS_ENDPOINT'
          value: 'cosmos-endpoint'
        }
        {
          name: 'KV_SECRET_COSMOS_KEY'
          value: 'cosmos-key'
        }
        {
          name: 'KV_SECRET_STORAGE_ACCOUNT_NAME'
          value: 'storage-account-name'
        }
        {
          name: 'COSMOS_DB_DATABASE'
          value: cosmosDatabaseName
        }
        {
          name: 'COSMOS_DB_CONTAINER'
          value: cosmosContainerName
        }
        {
          name: 'COSMOS_PARTITION_KEY_VALUE'
          value: cosmosPartitionKeyValue
        }
        {
          name: 'COSMOS_AUTO_CREATE'
          value: 'false'
        }
        {
          name: 'STORAGE_AUTO_CREATE_CONTAINER'
          value: 'false'
        }
      ]
    }
  }
}

output id string = webApp.id
output name string = webApp.name
output defaultHostName string = webApp.properties.defaultHostName
output principalId string = webApp.identity.principalId
output appServicePlanId string = appServicePlan.id
