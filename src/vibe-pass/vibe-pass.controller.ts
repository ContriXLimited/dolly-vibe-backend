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
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VibePassService } from './vibe-pass.service';
import { JoinProjectDto } from './dto/join-project.dto';
import { MintInftDto } from './dto/mint-inft.dto';
import { UploadMetadataDto } from './dto/upload-metadata.dto';
import { MintWithMetadataDto } from './dto/mint-with-metadata.dto';
import { GetMintParamsDto } from './dto/get-mint-params.dto';
import { ConfirmMintDto } from './dto/confirm-mint.dto';
import { QueryVibePassDto } from './dto/query-vibe-pass.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VibeUser } from '@prisma/client';

@ApiTags('VibePass Management')
@Controller('vibe-passes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VibePassController {
  constructor(private readonly vibePassService: VibePassService) {}

  @Post('join')
  @ApiOperation({ summary: 'Join a Vibe project and create VibePass' })
  @ApiResponse({ status: 201, description: 'Successfully joined project and created VibePass' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid project or user data' })
  @ApiResponse({ status: 409, description: 'Conflict - User has already joined this project' })
  async joinProject(
    @CurrentUser() currentUser: VibeUser,
    @Body() dto: JoinProjectDto,
  ) {
    const vibePass = await this.vibePassService.joinProject(currentUser, dto);
    return {
      message: 'Successfully joined project',
      data: vibePass,
    };
  }

  @Post(':id/mint')
  @ApiOperation({ summary: 'Mint INFT for VibePass' })
  @ApiParam({ name: 'id', description: 'VibePass ID' })
  @ApiResponse({ status: 200, description: 'Successfully minted INFT' })
  @ApiResponse({ status: 404, description: 'VibePass not found' })
  @ApiResponse({ status: 409, description: 'INFT already minted' })
  async mintInft(
    @Param('id') id: string,
    @Body() dto: MintInftDto,
  ) {
    const vibePass = await this.vibePassService.mintInft(id, dto);
    return {
      message: 'Successfully minted INFT',
      data: vibePass,
    };
  }

  @Post(':id/upload-metadata')
  @ApiOperation({ summary: 'Step 1: Upload metadata to 0G Storage for INFT minting' })
  @ApiParam({ name: 'id', description: 'VibePass ID' })
  @ApiResponse({ status: 200, description: 'Successfully uploaded metadata to 0G Storage' })
  @ApiResponse({ status: 404, description: 'VibePass not found' })
  @ApiResponse({ status: 409, description: 'INFT already minted' })
  async uploadMetadata(
    @Param('id') id: string,
    @Body() dto: UploadMetadataDto,
  ) {
    const result = await this.vibePassService.uploadMetadata(id, dto);
    return {
      message: result.message,
      data: {
        rootHash: result.rootHash,
        sealedKey: result.sealedKey,
      },
    };
  }

  @Post(':id/mint-with-metadata')
  @ApiOperation({ summary: 'Step 2: Mint INFT using uploaded metadata' })
  @ApiParam({ name: 'id', description: 'VibePass ID' })
  @ApiResponse({ status: 200, description: 'Successfully minted INFT using uploaded metadata' })
  @ApiResponse({ status: 404, description: 'VibePass not found' })
  @ApiResponse({ status: 409, description: 'INFT already minted' })
  async mintWithMetadata(
    @Param('id') id: string,
    @Body() dto: MintWithMetadataDto,
  ) {
    const vibePass = await this.vibePassService.mintWithMetadata(id, dto);
    return {
      message: 'Successfully minted INFT using uploaded metadata',
      data: vibePass,
    };
  }

  @Get(':id/get-mint-params')
  @ApiOperation({ summary: 'Get mint contract call parameters for frontend to execute transaction' })
  @ApiParam({ name: 'id', description: 'VibePass ID' })
  @ApiQuery({ name: 'walletAddress', description: 'User wallet address (recipient of the INFT)', example: '0x1234567890123456789012345678901234567890' })
  @ApiQuery({ name: 'rootHash', description: 'Root hash from metadata upload', example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' })
  @ApiQuery({ name: 'sealedKey', description: 'Sealed key from metadata upload (optional, will use stored value if not provided)', required: false, example: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' })
  @ApiResponse({ status: 200, description: 'Successfully prepared mint contract call parameters' })
  @ApiResponse({ status: 404, description: 'VibePass not found' })
  @ApiResponse({ status: 409, description: 'INFT already minted' })
  async getMintParams(
    @Param('id') id: string,
    @Query('walletAddress') walletAddress: string,
    @Query('rootHash') rootHash: string,
    @Query('sealedKey') sealedKey?: string,
  ) {
    const result = await this.vibePassService.getMintParams(id, { walletAddress, rootHash, sealedKey });
    return {
      message: 'Successfully prepared mint contract call parameters',
      data: result,
    };
  }

  @Post(':id/confirm-mint')
  @ApiOperation({ summary: 'Confirm mint transaction and extract tokenId from transaction hash' })
  @ApiParam({ name: 'id', description: 'VibePass ID' })
  @ApiResponse({ status: 200, description: 'Successfully confirmed mint and updated VibePass with tokenId' })
  @ApiResponse({ status: 404, description: 'VibePass not found' })
  @ApiResponse({ status: 409, description: 'INFT already minted' })
  @ApiResponse({ status: 400, description: 'Transaction not found or invalid' })
  async confirmMint(
    @Param('id') id: string,
    @Body() dto: ConfirmMintDto,
  ) {
    const vibePass = await this.vibePassService.confirmMint(id, dto);
    return {
      message: 'Successfully confirmed mint and updated VibePass',
      data: vibePass,
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user\'s VibePasses' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved user VibePasses' })
  async getMyVibePasses(@CurrentUser() currentUser: VibeUser) {
    const vibePasses = await this.vibePassService.findByUser(currentUser.id);
    return {
      message: 'Successfully retrieved VibePasses',
      data: vibePasses,
    };
  }

  @Get('check-exists')
  @Public()
  @ApiOperation({ summary: 'Check if VibePass exists for given User ID and Project ID' })
  @ApiResponse({ status: 200, description: 'Successfully checked VibePass existence' })
  @ApiQuery({ name: 'userId', description: 'User table ID (from Dolly system)', example: 'cuid2-example-user-id' })
  @ApiQuery({ name: 'projectId', description: 'Project table ID (from Dolly system)', example: 'cuid2-example-project-id' })
  async checkVibePassExists(
    @Query('userId') userId: string,
    @Query('projectId') projectId: string,
  ) {
    const result = await this.vibePassService.checkVibePassExists(userId, projectId);
    return {
      message: 'Successfully checked VibePass existence',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get VibePass by ID' })
  @ApiParam({ name: 'id', description: 'VibePass ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved VibePass' })
  @ApiResponse({ status: 404, description: 'VibePass not found' })
  async getVibePassById(@Param('id') id: string) {
    const vibePass = await this.vibePassService.findById(id);
    return {
      message: 'Successfully retrieved VibePass',
      data: vibePass,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Query VibePasses with pagination' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved VibePasses' })
  async queryVibePasses(@Query() dto: QueryVibePassDto) {
    const result = await this.vibePassService.findMany(dto);
    return {
      message: 'Successfully retrieved VibePasses',
      ...result,
    };
  }

  @Get('projects/default')
  @ApiOperation({ summary: 'Get default VibeProject information' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved default VibeProject' })
  @ApiResponse({ status: 404, description: 'Default VibeProject not found' })
  async getDefaultVibeProject() {
    const vibeProject = await this.vibePassService.getDefaultVibeProject();
    return {
      message: 'Successfully retrieved default VibeProject',
      data: vibeProject,
    };
  }
}