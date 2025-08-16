
export interface MintResult {
  tokenId: number;
  txHash: string;
  rootHash: string;
  sealedKey?: string;
}

export interface TokenInfo {
  tokenId: number;
  owner: string;
  dataHashes: string[];
  dataDescriptions: string[];
  authorizedUsers: string[];
}

export interface BlockchainConfig {
  chainId: number;
  rpcUrl: string;
  indexerUrl: string;
  privateKey: string;
  contractAddress: string;
}