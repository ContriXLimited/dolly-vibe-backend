import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmMintDto {
  @ApiProperty({
    description: 'Transaction hash of the mint transaction',
    example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiProperty({
    description: 'Root hash that was used for minting',
    example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  rootHash: string;

  @ApiProperty({
    description: 'Sealed key that was used for minting',
    example: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  sealedKey: string;
}