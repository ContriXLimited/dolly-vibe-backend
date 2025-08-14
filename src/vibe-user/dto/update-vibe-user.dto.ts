import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { VibeUserStatus } from '@prisma/client';

export class UpdateVibeUserDto {
  @ApiPropertyOptional({ 
    example: '123456789',
    description: 'Discord user ID' 
  })
  @IsOptional()
  @IsString()
  discordId?: string;

  @ApiPropertyOptional({ 
    example: '987654321',
    description: 'Twitter user ID' 
  })
  @IsOptional()
  @IsString()
  twitterId?: string;

  @ApiPropertyOptional({ 
    example: true,
    description: '是否加入0G项目方Discord'
  })
  @IsOptional()
  @IsBoolean()
  isJoined?: boolean;

  @ApiPropertyOptional({ 
    example: true,
    description: '是否关注Dolly Twitter'
  })
  @IsOptional()
  @IsBoolean()
  isFollowed?: boolean;

  @ApiPropertyOptional({ 
    enum: VibeUserStatus,
    example: VibeUserStatus.NORMAL,
    description: '用户状态'
  })
  @IsOptional()
  @IsEnum(VibeUserStatus)
  status?: VibeUserStatus;
}