import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { ProfileUpdateService } from './profile-update.service';
import { CreateProfileUpdateDto } from './dto/create-profile-update.dto';
import { QueryProfileUpdateDto } from './dto/query-profile-update.dto';
import { QueryScoreRecordDto } from './dto/query-score-record.dto';
import { AiApiGuard } from '../common/guards/ai-api.guard';

@ApiTags('Profile Update Management')
@Controller('profile-updates')
export class ProfileUpdateController {
  constructor(private readonly profileUpdateService: ProfileUpdateService) {}

  @Post()
  @UseGuards(AiApiGuard)
  @ApiOperation({ summary: 'Create profile update record (AI API)' })
  @ApiHeader({
    name: 'x-ai-secret',
    description: 'AI API secret key',
    required: true,
  })
  @ApiResponse({ status: 201, description: 'Successfully created profile update' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid AI API secret' })
  @ApiResponse({ status: 404, description: 'User or VibePass not found' })
  async createProfileUpdate(@Body() dto: CreateProfileUpdateDto) {
    const record = await this.profileUpdateService.createProfileUpdate(dto);
    return {
      message: 'Successfully created profile update',
      data: record,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Query profile update records' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved profile updates' })
  async getProfileUpdates(@Query() dto: QueryProfileUpdateDto) {
    const result = await this.profileUpdateService.findProfileUpdates(dto);
    return {
      message: 'Successfully retrieved profile updates',
      ...result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get profile update record by ID' })
  @ApiParam({ name: 'id', description: 'ProfileUpdateRecord ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved profile update' })
  @ApiResponse({ status: 404, description: 'Profile update record not found' })
  async getProfileUpdateById(@Param('id') id: string) {
    const record = await this.profileUpdateService.getProfileUpdateById(id);
    return {
      message: 'Successfully retrieved profile update',
      data: record,
    };
  }
}

@ApiTags('Score Record Management')
@Controller('score-records')
export class ScoreRecordController {
  constructor(private readonly profileUpdateService: ProfileUpdateService) {}

  @Get(':vibePassId')
  @ApiOperation({ summary: 'Get score records for a VibePass' })
  @ApiParam({ name: 'vibePassId', description: 'VibePass ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved score records' })
  @ApiResponse({ status: 404, description: 'VibePass not found' })
  async getScoreRecords(
    @Param('vibePassId') vibePassId: string,
    @Query() dto: QueryScoreRecordDto,
  ) {
    const result = await this.profileUpdateService.findScoreRecords(vibePassId, dto);
    return {
      message: 'Successfully retrieved score records',
      ...result,
    };
  }

  @Get('record/:id')
  @ApiOperation({ summary: 'Get score record by ID' })
  @ApiParam({ name: 'id', description: 'ScoreRecord ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved score record' })
  @ApiResponse({ status: 404, description: 'Score record not found' })
  async getScoreRecordById(@Param('id') id: string) {
    const record = await this.profileUpdateService.getScoreRecordById(id);
    return {
      message: 'Successfully retrieved score record',
      data: record,
    };
  }
}