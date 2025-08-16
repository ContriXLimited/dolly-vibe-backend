import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JoinProjectDto {
  @ApiPropertyOptional({
    description: 'VibeProject ID (optional, defaults to default project)',
    example: 'cuid2-example-vibe-project-id',
  })
  @IsOptional()
  @IsString()
  vibeProjectId?: string;
}