import "server-only";

import { getSecretValue } from "@/lib/keyvault";

export interface AppSettings {
  cosmos: {
    endpoint: string;
    key: string;
    databaseName: string;
    containerName: string;
    partitionKeyValue: string;
    autoCreate: boolean;
  };
  storage: {
    accountName: string;
    containerName: string;
    connectionString?: string;
    autoCreateContainer: boolean;
  };
  keyVaultUrl?: string;
}

interface SettingOptions {
  envName: string;
  required?: boolean;
  secretName?: string;
  keyVaultUrl?: string;
}

let appSettingsPromise: Promise<AppSettings> | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

async function readSetting(options: SettingOptions): Promise<string | undefined> {
  const fromEnv = readEnv(options.envName);
  if (fromEnv) {
    return fromEnv;
  }

  if (options.keyVaultUrl && options.secretName) {
    const fromKeyVault = await getSecretValue(options.keyVaultUrl, options.secretName);
    if (fromKeyVault) {
      return fromKeyVault;
    }
  }

  if (options.required) {
    throw new Error(`Configuration manquante: ${options.envName}`);
  }

  return undefined;
}

async function loadAppSettings(): Promise<AppSettings> {
  const keyVaultUrl = readEnv("AZURE_KEY_VAULT_URL");

  const cosmosEndpoint = await readSetting({
    envName: "COSMOS_DB_ENDPOINT",
    required: true,
    secretName: readEnv("KV_SECRET_COSMOS_ENDPOINT") ?? "cosmos-endpoint",
    keyVaultUrl,
  });

  const cosmosKey = await readSetting({
    envName: "COSMOS_DB_KEY",
    required: true,
    secretName: readEnv("KV_SECRET_COSMOS_KEY") ?? "cosmos-key",
    keyVaultUrl,
  });

  const storageAccountName = await readSetting({
    envName: "AZURE_STORAGE_ACCOUNT_NAME",
    required: true,
    secretName: readEnv("KV_SECRET_STORAGE_ACCOUNT_NAME") ?? "storage-account-name",
    keyVaultUrl,
  });

  const storageConnectionString = await readSetting({
    envName: "AZURE_STORAGE_CONNECTION_STRING",
    required: false,
    secretName: readEnv("KV_SECRET_STORAGE_CONNECTION_STRING") ?? "storage-connection-string",
    keyVaultUrl,
  });

  return {
    cosmos: {
      endpoint: cosmosEndpoint as string,
      key: cosmosKey as string,
      databaseName: readEnv("COSMOS_DB_DATABASE") ?? "todoapp",
      containerName: readEnv("COSMOS_DB_CONTAINER") ?? "todos",
      partitionKeyValue: readEnv("COSMOS_PARTITION_KEY_VALUE") ?? "todo-app",
      autoCreate: readEnv("COSMOS_AUTO_CREATE") === "true",
    },
    storage: {
      accountName: storageAccountName as string,
      containerName: readEnv("AZURE_STORAGE_CONTAINER_NAME") ?? "todo-attachments",
      connectionString: storageConnectionString,
      autoCreateContainer: readEnv("STORAGE_AUTO_CREATE_CONTAINER") === "true",
    },
    keyVaultUrl,
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  if (!appSettingsPromise) {
    appSettingsPromise = loadAppSettings();
  }

  return appSettingsPromise;
}
