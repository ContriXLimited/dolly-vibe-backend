import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MintInftDto {
  @ApiProperty({
    description: 'User wallet address',
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
    description: 'Additional token metadata (optional)',
    example: { name: 'User INFT #1', description: 'Intelligent NFT for user' },
  })
  @IsOptional()
  @IsObject()
  tokenMetadata?: any;
}