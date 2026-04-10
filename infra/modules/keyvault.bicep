@description('Key Vault name.')
param name string

@description('Azure region for Key Vault.')
param location string

@description('Tenant ID for the Key Vault.')
param tenantId string

@description('Cosmos DB endpoint secret value.')
param cosmosEndpoint string

@secure()
@description('Cosmos DB key secret value.')
param cosmosKey string

@description('Storage account name secret value.')
param storageAccountName string

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

resource cosmosEndpointSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'cosmos-endpoint'
  properties: {
    value: cosmosEndpoint
  }
}

resource cosmosKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'cosmos-key'
  properties: {
    value: cosmosKey
  }
}

resource storageAccountSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'storage-account-name'
  properties: {
    value: storageAccountName
  }
}

output id string = vault.id
output name string = vault.name
output vaultUri string = vault.properties.vaultUri
output cosmosEndpointSecretUri string = cosmosEndpointSecret.properties.secretUriWithVersion
output cosmosKeySecretUri string = cosmosKeySecret.properties.secretUriWithVersion
output storageAccountSecretUri string = storageAccountSecret.properties.secretUriWithVersion
