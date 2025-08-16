import * as crypto from 'crypto';
import { ethers } from 'ethers';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  
  /**
   * Generate a cryptographically secure random key
   */
  generateKey(): Buffer {
    return crypto.randomBytes(32);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encrypt(data: string, key: Buffer): Promise<Buffer> {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(data, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const tag = cipher.getAuthTag();
      
      // Return: iv + encrypted + tag
      return Buffer.concat([iv, encrypted, tag]);
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  async decrypt(encryptedData: Buffer, key: Buffer): Promise<string> {
    try {
      const iv = encryptedData.subarray(0, 16);
      const tag = encryptedData.subarray(-16);
      const encrypted = encryptedData.subarray(16, -16);

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Seal key for recipient using their public key
   * Simplified implementation - in production use proper ECIES
   */
  async sealKey(encryptionKey: Buffer, recipientPublicKey: string): Promise<string> {
    try {
      // Simplified sealing using public key hash
      const pubKeyBuffer = Buffer.from(recipientPublicKey.replace('0x', ''), 'hex');
      const keyHash = crypto.createHash('sha256').update(pubKeyBuffer).digest();
      
      const sealedKey = Buffer.alloc(16); // 16 bytes sealed key
      for (let i = 0; i < 16; i++) {
        sealedKey[i] = encryptionKey[i] ^ keyHash[i];
      }
      
      return sealedKey.toString('hex');
    } catch (error: any) {
      throw new Error(`Key sealing failed: ${error.message}`);
    }
  }

  /**
   * Unseal key using private key
   */
  async unsealKey(sealedKeyHex: string, privateKey: string): Promise<Buffer> {
    try {
      const publicKey = ethers.SigningKey.computePublicKey(privateKey, false); // Uncompressed public key
      
      const sealedKey = Buffer.from(sealedKeyHex, 'hex');
      const pubKeyBuffer = Buffer.from(publicKey.replace('0x', ''), 'hex');
      const keyHash = crypto.createHash('sha256').update(pubKeyBuffer).digest();
      
      const unsealedKey = Buffer.alloc(32);
      for (let i = 0; i < 16; i++) {
        unsealedKey[i] = sealedKey[i] ^ keyHash[i];
      }
      
      return unsealedKey;
    } catch (error: any) {
      throw new Error(`Key unsealing failed: ${error.message}`);
    }
  }
}