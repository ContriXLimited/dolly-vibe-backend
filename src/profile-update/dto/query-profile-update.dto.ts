import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryProfileUpdateDto {
  @ApiPropertyOptional({
    description: 'User ID to filter by',
    example: 'cuid2-example-user-id',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'VibePass ID to filter by',
    example: 'cuid2-example-vibe-pass-id',
  })
  @IsOptional()
  @IsString()
  vibePassId?: string;

  @ApiPropertyOptional({
    description: 'Page number (starting from 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;
}