import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IsEthereumAddress } from '../../common/validators/ethereum-address.validator';

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