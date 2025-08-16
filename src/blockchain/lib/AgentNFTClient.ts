import { ethers } from 'ethers';
import { MetadataManager } from '../lib/managers/MetadataManager';
import { TransferManager } from '../lib/managers/TransferManager';
import { ZGStorage } from '../lib/services/ZGStorage';
import { EncryptionService } from '../lib/services/EncryptionService';
import {AIModelData, StorageConfig, EncryptedMetadataResult} from '../lib/types';
import * as AgentNFTABI from '../abi/AgentNFT.json';

export class AgentNFTClient {
  private contract: ethers.Contract;
  private wallet: ethers.Wallet;
  private metadataManager: MetadataManager;
  private transferManager: TransferManager;
  private provider: ethers.Provider;

  constructor(
    contractAddress: string,
    privateKey: string,
    provider: ethers.Provider,
    ogStorageConfig: StorageConfig
  ) {
    this.provider = provider;
    this.wallet = new ethers.Wallet(privateKey, provider);
    
    // Load contract ABI from Hardhat artifacts
    this.contract = new ethers.Contract(contractAddress, AgentNFTABI, this.wallet);

    // Initialize services with fallback support
    const ogStorage = new ZGStorage(this.wallet, ogStorageConfig);
    const encryptionService = new EncryptionService();
    this.metadataManager = new MetadataManager(ogStorage, encryptionService);
    this.transferManager = new TransferManager(ogStorage, encryptionService, this.metadataManager);
  }

  /**
   * Upload metadata to 0G Storage and get encrypted result
   */
  async makeMetadata(aiModelData: AIModelData, recipientAddress?: string): Promise<EncryptedMetadataResult> {
    try {
      const to = recipientAddress || this.wallet.address;
      const recipientPublicKey = this.getPublicKeyFromPrivateKey(this.wallet.privateKey);

      console.log('Creating encrypted AI agent metadata...');
      const encryptedResult = await this.metadataManager.createAIAgent(
        aiModelData,
        recipientPublicKey
      );

      console.log(`Metadata uploaded successfully - rootHash: ${encryptedResult.rootHash}`);
      return encryptedResult;
    } catch (error: any) {
      throw new Error(`Make metadata failed: ${error.message}`);
    }
  }

  /**
   * Mint a new AgentNFT with AI agent data
   */
  async mint(aiModelData: AIModelData, recipientAddress?: string, encryptedResult?: EncryptedMetadataResult): Promise<{
    tokenId: number;
    txHash: string;
    rootHash: string;
    sealedKey: string;
  }> {
    try {
      const to = recipientAddress || this.wallet.address;
      
      let finalEncryptedResult: EncryptedMetadataResult;
      
      if (encryptedResult) {
        // Use provided encrypted result (skip createAIAgent)
        finalEncryptedResult = encryptedResult;
        console.log('Using provided encrypted metadata...');
      } else {
        // Create and encrypt AI agent metadata
        const recipientPublicKey = this.getPublicKeyFromPrivateKey(this.wallet.privateKey);
        console.log('Creating encrypted AI agent metadata...');
        finalEncryptedResult = await this.metadataManager.createAIAgent(
          aiModelData,
          recipientPublicKey
        );
      }

      // 2. Generate preimage proof for the encrypted data
      // This proof verifies that we know the preimage of the dataHash
      console.log('Generating preimage proof...');
      const proof = await this.generatePreimageProof(
        finalEncryptedResult.rootHash,
        finalEncryptedResult.encryptionKey!
      );

      // 3. Prepare data descriptions
      const dataDescriptions = [
        `INFT: ${aiModelData.name || 'Dolly Vibe Agent'} - ${aiModelData.description || 'Intelligent NFT based on user profile'}`
      ];

      // 4. Call mint function on contract
      console.log('Minting AgentNFT...');
      const tx = await this.contract.mint(
        [proof],                // proofs for data correctness verification
        dataDescriptions,       // human-readable data descriptions
        to                      // recipient address
      );

      const receipt = await tx.wait();
      
      // Extract tokenId from Minted event
      const mintedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'Minted';
        } catch {
          return false;
        }
      });

      if (!mintedEvent) {
        throw new Error('Minted event not found');
      }

      const parsedEvent = this.contract.interface.parseLog(mintedEvent);
      const tokenId = Number(parsedEvent?.args._tokenId);

      console.log(`AgentNFT minted successfully! Token ID: ${tokenId}`);

      return {
        tokenId,
        txHash: tx.hash,
        rootHash: finalEncryptedResult.rootHash,
        sealedKey: finalEncryptedResult.sealedKey,
      };
    } catch (error: any) {
      throw new Error(`Mint failed: ${error.message}`);
    }
  }

  /**
   * Transfer AgentNFT to another address
   */
  async transfer(tokenId: number, toAddress: string): Promise<string> {
    try {
      console.log(`Transferring token ${tokenId} to ${toAddress}...`);

      // 1. Get current token data
      const tokenData = await this.getTokenData(tokenId);
      
      // 2. Prepare transfer proofs
      const transferResult = await this.transferManager.prepareTransfer(
        tokenId,
        this.wallet.privateKey,
        toAddress,
        [tokenData.rootHash], // Assuming single data item for simplicity
        tokenData.dataHashes
      );

      // 3. Execute transfer
      const tx = await this.contract.transfer(
        toAddress,
        tokenId,
        transferResult.proofs
      );

      await tx.wait();
      console.log(`Transfer completed! Transaction hash: ${tx.hash}`);

      return tx.hash;
    } catch (error: any) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Clone AgentNFT for another address
   */
  async clone(tokenId: number, toAddress: string, modifications?: any): Promise<{
    newTokenId: number;
    txHash: string;
  }> {
    try {
      console.log(`Cloning token ${tokenId} for ${toAddress}...`);

      // 1. Get current token data
      const tokenData = await this.getTokenData(tokenId);

      // 2. Prepare clone proofs
      const cloneResult = await this.transferManager.prepareClone(
        tokenId,
        this.wallet.privateKey,
        toAddress,
        [tokenData.rootHash], // Assuming single data item for simplicity
        tokenData.dataHashes,
        modifications
      );

      // 3. Execute clone
      const tx = await this.contract.clone(
        toAddress,
        tokenId,
        cloneResult.proofs
      );

      const receipt = await tx.wait();

      // Extract new tokenId from Cloned event
      const clonedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'Cloned';
        } catch {
          return false;
        }
      });

      if (!clonedEvent) {
        throw new Error('Cloned event not found');
      }

      const parsedEvent = this.contract.interface.parseLog(clonedEvent);
      const newTokenId = Number(parsedEvent?.args.newTokenId);

      console.log(`Clone completed! New Token ID: ${newTokenId}`);

      return {
        newTokenId,
        txHash: tx.hash,
      };
    } catch (error: any) {
      throw new Error(`Clone failed: ${error.message}`);
    }
  }

  /**
   * Update AgentNFT data
   */
  async update(tokenId: number, updatedModelData: Partial<AIModelData>): Promise<string> {
    try {
      console.log(`Updating token ${tokenId}...`);

      // 1. Get current token data and decrypt it
      const currentTokenData = await this.getTokenData(tokenId);
      const currentEncryptionKey = await this.getCurrentEncryptionKey(tokenId);
      
      // 2. Update the metadata
      const updatedResult = await this.metadataManager.updateAIAgent(
        currentTokenData.rootHash,
        currentEncryptionKey,
        updatedModelData,
        this.getPublicKeyFromPrivateKey(this.wallet.privateKey)
      );

      // 3. Generate proof for updated data
      const proof = await this.generatePreimageProof(
        updatedResult.rootHash,
        updatedResult.encryptionKey!
      );

      // 4. Execute update
      const tx = await this.contract.update(tokenId, [proof]);
      await tx.wait();

      console.log(`Update completed! Transaction hash: ${tx.hash}`);
      return tx.hash;
    } catch (error: any) {
      throw new Error(`Update failed: ${error.message}`);
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenId: number): Promise<any> {
    try {
      const [owner, dataHashes, dataDescriptions, authorizedUsers] = await Promise.all([
        this.contract.ownerOf(tokenId),
        this.contract.dataHashesOf(tokenId),
        this.contract.dataDescriptionsOf(tokenId),
        this.contract.authorizedUsersOf(tokenId),
      ]);

      return {
        tokenId,
        owner,
        dataHashes,
        dataDescriptions,
        authorizedUsers,
      };
    } catch (error: any) {
      throw new Error(`Failed to get token info: ${error.message}`);
    }
  }

  /**
   * Authorize usage for a user
   */
  async authorizeUsage(tokenId: number, userAddress: string): Promise<string> {
    try {
      const tx = await this.contract.authorizeUsage(tokenId, userAddress);
      await tx.wait();
      return tx.hash;
    } catch (error: any) {
      throw new Error(`Authorization failed: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Get current encryption key for a token (simplified for demo)
   */
  private async getCurrentEncryptionKey(tokenId: number): Promise<Buffer> {
    // In production, this would:
    // 1. Get the sealed key from contract events or storage
    // 2. Unseal it using the owner's private key
    
    // For demo, generate a deterministic key
    const keyMaterial = `${this.wallet.privateKey}-${tokenId}`;
    return Buffer.from(ethers.keccak256(ethers.toUtf8Bytes(keyMaterial)).slice(2), 'hex');
  }

  /**
   * Get token data including rootHash (simplified)
   */
  private async getTokenData(tokenId: number): Promise<{ rootHash: string; dataHashes: string[] }> {
    const dataHashes = await this.contract.dataHashesOf(tokenId);
    
    // In production, you would map dataHashes back to rootHashes
    // For demo, assume first dataHash corresponds to rootHash
    const rootHash = dataHashes[0] || ethers.ZeroHash;
    
    return {
      rootHash,
      dataHashes,
    };
  }

  /**
   * Get public key from private key
   */
  public getPublicKeyFromPrivateKey(privateKey: string): string {
    const signingKey = new ethers.SigningKey(privateKey);
    return signingKey.publicKey;
  }

  /**
   * Extract token ID from transaction receipt
   */
  public extractTokenIdFromReceipt(receipt: any): number {
    const mintedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'Minted';
      } catch {
        return false;
      }
    });

    if (!mintedEvent) {
      throw new Error('Minted event not found in receipt');
    }

    const parsedEvent = this.contract.interface.parseLog(mintedEvent);
    return Number(parsedEvent?.args.tokenId);
  }

  /**
   * Generate preimage proof (public method for service access)
   */
  public async generatePreimageProof(rootHash: string, encryptionKey: Buffer): Promise<string> {
    try {
      // In production, this would generate a proper TEE/ZKP proof
      // For now, we'll create a mock proof that contains the necessary data
      
      // The proof should demonstrate knowledge of:
      // 1. The preimage of the dataHash (for public data)
      // 2. The plaintext of encrypted data (for private data)
      
      // Mock proof format: dataHash + nonce (64 bytes total)
      return ethers.keccak256(ethers.toUtf8Bytes(rootHash));
      // const nonce = ethers.randomBytes(32);
      //
      // const proof = ethers.concat([dataHash, nonce]);
      // return ethers.hexlify(proof);
    } catch (error: any) {
      throw new Error(`Failed to generate preimage proof: ${error.message}`);
    }
  }

  /**
   * Get contract instance (public method for service access)
   */
  public getContract(): ethers.Contract {
    return this.contract;
  }

  /**
   * Get wallet instance (public method for service access)
   */
  public getWallet(): ethers.Wallet {
    return this.wallet;
  }
}