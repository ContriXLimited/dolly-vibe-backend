import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeWindow {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  ALL = 'all',
}

export class QueryLeaderboardDto {
  @ApiPropertyOptional({
    description: 'Time window for leaderboard',
    enum: TimeWindow,
    example: TimeWindow.ALL,
    default: TimeWindow.ALL,
  })
  @IsOptional()
  @IsEnum(TimeWindow)
  timeWindow?: TimeWindow = TimeWindow.ALL;

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
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 50;
}