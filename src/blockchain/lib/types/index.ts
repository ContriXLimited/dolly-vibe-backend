
export interface AIModelData {
  name: string;
  version?: string;
  description?: string;
  parameters?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: number
  updatedAt?: number
}

export interface EncryptedMetadataResult {
  rootHash: string;
  sealedKey: string;
  encryptionKey?: Buffer;
}

export interface StorageResult {
  txHash: string;
  rootHash: string;
  size: number;
}

export interface DecryptedMetadata {
  metadata: AIModelData;
  isValid: boolean;
}

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm';
  keyDerivation: 'pbkdf2';
  iterations: number;
  keyLength: number;
  ivLength: number;
  tagLength: number;
}

export interface FallbackConfig {
  enableFallback: boolean;
  localStorageDir: string;
  retryAttempts: number;
  retryDelay: number;
  preferLocal: boolean;
}

export interface StorageConfig {
  rpcUrl: string;
  indexerUrl: string;
  chainId: number;
  uploadTimeoutMs?: number;

  fallback?: Partial<FallbackConfig>;
}

export interface ProofData {
  oldDataHash: string;
  newDataHash: string;
  pubKey: string;
  sealedKey: string;
}