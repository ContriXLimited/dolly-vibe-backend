import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { VibeUserStatus } from '@prisma/client';

export class CreateVibeUserDto {
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
    example: false,
    description: '是否加入0G项目方Discord',
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isJoined?: boolean;

  @ApiPropertyOptional({ 
    example: false,
    description: '是否关注Dolly Twitter',
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isFollowed?: boolean;

  @ApiPropertyOptional({ 
    enum: VibeUserStatus,
    example: VibeUserStatus.NORMAL,
    description: '用户状态',
    default: VibeUserStatus.NORMAL 
  })
  @IsOptional()
  status?: VibeUserStatus;
}