import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IsEthereumAddress } from '../../common/validators/ethereum-address.validator';

export class WalletLoginResponseDto {
  @ApiProperty({ 
    example: true,
    description: 'Whether wallet verification was successful' 
  })
  verified: boolean;

  @ApiProperty({ 
    example: '0x1234567890123456789012345678901234567890',
    description: 'Verified wallet address' 
  })
  walletAddress: string;

  @ApiProperty({ 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token for authentication' 
  })
  access_token: string;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'clj123456789' },
      walletAddress: { type: 'string', example: '0x1234567890123456789012345678901234567890' },
      discordId: { type: 'string', example: '123456789', nullable: true },
      twitterId: { type: 'string', example: '987654321', nullable: true },
      discordUsername: { type: 'string', example: 'user#1234', nullable: true },
      twitterUsername: { type: 'string', example: 'dollyuser', nullable: true },
      discordConnected: { type: 'boolean', example: false },
      twitterConnected: { type: 'boolean', example: false },
      walletConnected: { type: 'boolean', example: true },
      isJoined: { type: 'boolean', example: false },
      isFollowed: { type: 'boolean', example: false },
      allConnected: { type: 'boolean', example: false },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
      status: { type: 'string', example: 'NORMAL' }
    }
  })
  user: {
    id: string;
    walletAddress: string;
    discordId?: string;
    twitterId?: string;
    discordUsername?: string;
    twitterUsername?: string;
    discordConnected: boolean;
    twitterConnected: boolean;
    walletConnected: boolean;
    isJoined: boolean;
    isFollowed: boolean;
    allConnected: boolean;
    completedAt?: Date;
    status: string;
  };
}

export class GetNonceDto {
  @ApiProperty({ 
    example: '0x1234567890123456789012345678901234567890',
    description: 'Ethereum wallet address' 
  })
  @IsEthereumAddress()
  walletAddress: string;
}

export class VerifyWalletDto {
  @ApiProperty({ 
    example: '0x1234567890123456789012345678901234567890',
    description: 'Ethereum wallet address' 
  })
  @IsEthereumAddress()
  walletAddress: string;

  @ApiProperty({ 
    example: 'abc123def456',
    description: 'Nonce received from /nonce endpoint' 
  })
  @IsString()
  nonce: string;

  @ApiProperty({ 
    example: '0x123abc...',
    description: 'Signature from wallet' 
  })
  @IsString()
  signature: string;
}