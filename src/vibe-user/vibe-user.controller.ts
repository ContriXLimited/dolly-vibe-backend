import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VibeUserService } from './vibe-user.service';
import { CreateVibeUserDto } from './dto/create-vibe-user.dto';
import { UpdateVibeUserDto } from './dto/update-vibe-user.dto';
import { QueryVibeUserDto } from './dto/query-vibe-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VibeUserStatus } from '@prisma/client';

@ApiTags('VibeUser Management')
@Controller('vibe-users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VibeUserController {
  constructor(private readonly vibeUserService: VibeUserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new VibeUser' })
  @ApiResponse({ status: 201, description: 'VibeUser created successfully' })
  @ApiResponse({ status: 409, description: 'Discord ID or Twitter ID already exists' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createVibeUserDto: CreateVibeUserDto) {
    return this.vibeUserService.create(createVibeUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all VibeUsers with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of VibeUsers retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'discordId', required: false, type: String })
  @ApiQuery({ name: 'twitterId', required: false, type: String })
  @ApiQuery({ name: 'isJoined', required: false, type: Boolean })
  @ApiQuery({ name: 'isFollowed', required: false, type: Boolean })
  @ApiQuery({ name: 'status', required: false, enum: VibeUserStatus })
  findAll(@Query() queryDto: QueryVibeUserDto) {
    return this.vibeUserService.findAll(queryDto);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get VibeUser statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics() {
    return this.vibeUserService.getStatistics();
  }

  @Get('discord/:discordId')
  @ApiOperation({ summary: 'Find VibeUser by Discord ID' })
  @ApiResponse({ status: 200, description: 'VibeUser found' })
  @ApiResponse({ status: 404, description: 'VibeUser not found' })
  @ApiParam({ name: 'discordId', description: 'Discord user ID' })
  findByDiscordId(@Param('discordId') discordId: string) {
    return this.vibeUserService.findByDiscordId(discordId);
  }

  @Get('twitter/:twitterId')
  @ApiOperation({ summary: 'Find VibeUser by Twitter ID' })
  @ApiResponse({ status: 200, description: 'VibeUser found' })
  @ApiResponse({ status: 404, description: 'VibeUser not found' })
  @ApiParam({ name: 'twitterId', description: 'Twitter user ID' })
  findByTwitterId(@Param('twitterId') twitterId: string) {
    return this.vibeUserService.findByTwitterId(twitterId);
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get VibeUser by ID' })
  @ApiResponse({ status: 200, description: 'VibeUser retrieved successfully' })
  @ApiResponse({ status: 404, description: 'VibeUser not found' })
  @ApiParam({ name: 'id', description: 'VibeUser ID' })
  findOne(@Param('id') id: string) {
    return this.vibeUserService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update VibeUser' })
  @ApiResponse({ status: 200, description: 'VibeUser updated successfully' })
  @ApiResponse({ status: 404, description: 'VibeUser not found' })
  @ApiResponse({ status: 409, description: 'Discord ID or Twitter ID already exists' })
  @ApiParam({ name: 'id', description: 'VibeUser ID' })
  update(@Param('id') id: string, @Body() updateVibeUserDto: UpdateVibeUserDto) {
    return this.vibeUserService.update(id, updateVibeUserDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update VibeUser status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'VibeUser not found' })
  @ApiParam({ name: 'id', description: 'VibeUser ID' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: VibeUserStatus },
  ) {
    return this.vibeUserService.updateStatus(id, body.status);
  }

  @Patch(':id/social-status')
  @ApiOperation({ summary: 'Update VibeUser social status (joined/followed)' })
  @ApiResponse({ status: 200, description: 'Social status updated successfully' })
  @ApiResponse({ status: 404, description: 'VibeUser not found' })
  @ApiParam({ name: 'id', description: 'VibeUser ID' })
  updateSocialStatus(
    @Param('id') id: string,
    @Body() body: { isJoined?: boolean; isFollowed?: boolean },
  ) {
    return this.vibeUserService.updateSocialStatus(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete VibeUser' })
  @ApiResponse({ status: 204, description: 'VibeUser deleted successfully' })
  @ApiResponse({ status: 404, description: 'VibeUser not found' })
  @ApiParam({ name: 'id', description: 'VibeUser ID' })
  async remove(@Param('id') id: string) {
    await this.vibeUserService.remove(id);
  }
}