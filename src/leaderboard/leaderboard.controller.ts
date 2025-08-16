import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { QueryLeaderboardDto, TimeWindow } from './dto/query-leaderboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get(':vibeProjectId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get project leaderboard' })
  @ApiParam({ name: 'vibeProjectId', description: 'VibeProject ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved project leaderboard' })
  @ApiResponse({ status: 404, description: 'VibeProject not found' })
  async getProjectLeaderboard(
    @Param('vibeProjectId') vibeProjectId: string,
    @Query() dto: QueryLeaderboardDto,
  ) {
    const result = await this.leaderboardService.getProjectLeaderboard(vibeProjectId, dto);
    return {
      message: 'Successfully retrieved project leaderboard',
      ...result,
    };
  }

  @Get('global/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get global leaderboard' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved global leaderboard' })
  async getGlobalLeaderboard(@Query() dto: QueryLeaderboardDto) {
    const result = await this.leaderboardService.getGlobalLeaderboard(dto);
    return {
      message: 'Successfully retrieved global leaderboard',
      ...result,
    };
  }

  @Get(':vibeProjectId/rank/:vibePassId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user rank in project leaderboard' })
  @ApiParam({ name: 'vibeProjectId', description: 'VibeProject ID' })
  @ApiParam({ name: 'vibePassId', description: 'VibePass ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved user rank' })
  @ApiResponse({ status: 404, description: 'VibeProject or VibePass not found' })
  async getUserRank(
    @Param('vibeProjectId') vibeProjectId: string,
    @Param('vibePassId') vibePassId: string,
    @Query('timeWindow') timeWindow?: TimeWindow,
  ) {
    const result = await this.leaderboardService.getUserRank(
      vibeProjectId,
      vibePassId,
      timeWindow || TimeWindow.ALL,
    );
    return {
      message: 'Successfully retrieved user rank',
      data: result,
    };
  }

  @Get('global/rank/:vibePassId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user rank in global leaderboard' })
  @ApiParam({ name: 'vibePassId', description: 'VibePass ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved user global rank' })
  @ApiResponse({ status: 404, description: 'VibePass not found' })
  async getGlobalUserRank(
    @Param('vibePassId') vibePassId: string,
    @Query('timeWindow') timeWindow?: TimeWindow,
  ) {
    const result = await this.leaderboardService.getGlobalUserRank(
      vibePassId,
      timeWindow || TimeWindow.ALL,
    );
    return {
      message: 'Successfully retrieved user global rank',
      data: result,
    };
  }
}