import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfileUpdateDto {
  @ApiPropertyOptional({
    description: 'User ID (for regular User profile update)',
    example: 'cuid2-example-user-id',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'VibePass ID (for VibePass profile update)',
    example: 'cuid2-example-vibe-pass-id',
  })
  @IsOptional()
  @IsString()
  vibePassId?: string;

  @ApiProperty({
    description: 'Message IDs involved in this analysis',
    example: ['msg1', 'msg2', 'msg3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  messageIds: string[];

  @ApiProperty({
    description: 'New analyzed user profile',
    example: 'This user is highly engaged in blockchain discussions...',
  })
  @IsString()
  @IsNotEmpty()
  newProfile: string;

  @ApiPropertyOptional({
    description: 'New analyzed INFT total score',
    example: 85.5,
  })
  @IsOptional()
  @IsNumber()
  newScore?: number;

  @ApiPropertyOptional({
    description: 'New INFT parameter values for radar chart (5 dimensions)',
    example: [75, 80, 90, 70, 85],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  newParams?: number[];

  @ApiPropertyOptional({
    description: 'New analyzed tags',
    example: ['blockchain', 'defi', 'active-member'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  newTags?: string[];

  @ApiPropertyOptional({
    description: 'New INFT metadata root hash',
    example: 'QmXYZ123...',
  })
  @IsOptional()
  @IsString()
  newRootHash?: string;
}