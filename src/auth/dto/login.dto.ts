import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: '0x1234567890123456789012345678901234567890',
    description: 'Ethereum wallet address'
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Invalid wallet address format'
  })
  walletAddress: string;
}