import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetMintParamsDto {
  @ApiProperty({
    description: 'User wallet address (recipient of the INFT)',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    description: 'Nonce from wallet verification',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  nonce: string;

  @ApiProperty({
    description: 'User wallet signature for minting authorization',
    example: '0x123456789abcdef...',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiPropertyOptional({
    description: 'Root hash from metadata upload (required if metadata was pre-uploaded)',
    example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  @IsOptional()
  @IsString()
  rootHash?: string;

  @ApiPropertyOptional({
    description: 'Sealed key from metadata upload (optional, will use stored value if not provided)',
    example: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  @IsOptional()
  @IsString()
  sealedKey?: string;

  @ApiPropertyOptional({
    description: 'Additional token metadata (optional)',
    example: { name: 'User INFT #1', description: 'Intelligent NFT for user' },
  })
  @IsOptional()
  @IsObject()
  tokenMetadata?: any;
}