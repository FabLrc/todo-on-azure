import "server-only";

import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

const clientCache = new Map<string, SecretClient>();
const secretValueCache = new Map<string, string>();

function getSecretClient(vaultUrl: string): SecretClient {
  const existingClient = clientCache.get(vaultUrl);
  if (existingClient) {
    return existingClient;
  }

  const client = new SecretClient(vaultUrl, new DefaultAzureCredential());
  clientCache.set(vaultUrl, client);

  return client;
}

export async function getSecretValue(vaultUrl: string, secretName: string): Promise<string | undefined> {
  const cacheKey = `${vaultUrl}::${secretName}`;
  const cachedValue = secretValueCache.get(cacheKey);
  if (cachedValue) {
    return cachedValue;
  }

  const client = getSecretClient(vaultUrl);

  try {
    const secret = await client.getSecret(secretName);
    if (secret.value) {
      secretValueCache.set(cacheKey, secret.value);
    }

    return secret.value;
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404) {
      return undefined;
    }

    throw error;
  }
}
