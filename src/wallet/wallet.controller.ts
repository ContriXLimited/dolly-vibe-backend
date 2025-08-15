import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletVerificationService } from './services/wallet-verification.service';
import { GetNonceDto, VerifyWalletDto, WalletLoginResponseDto } from './dto/wallet-nonce.dto';

@ApiTags('Wallet Verification')
@Controller('auth/wallet')
export class WalletController {
  constructor(
    private readonly walletVerificationService: WalletVerificationService,
  ) {}

  @Get('nonce')
  @ApiOperation({ summary: '获取钱包签名用的nonce' })
  @ApiResponse({ 
    status: 200, 
    description: 'Nonce generated successfully',
    schema: {
      type: 'object',
      properties: {
        nonce: { type: 'string', example: 'abc123def456' },
        message: { type: 'string', example: 'Please sign this message to verify your wallet: abc123def456' },
        expiresAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid wallet address' })
  @ApiQuery({ 
    name: 'walletAddress', 
    type: String, 
    example: '0x1234567890123456789012345678901234567890' 
  })
  async getNonce(@Query('walletAddress') walletAddress: string) {
    return this.walletVerificationService.generateNonce(walletAddress);
  }

  @Post('verify')
  @ApiOperation({ summary: '验证钱包签名并登录（钱包连接即登录）' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet verified successfully and user logged in',
    type: WalletLoginResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid signature or nonce' })
  async verifyWallet(@Body() verifyWalletDto: VerifyWalletDto): Promise<WalletLoginResponseDto> {
    return this.walletVerificationService.verifyWalletSignature(
      verifyWalletDto.walletAddress,
      verifyWalletDto.nonce,
      verifyWalletDto.signature,
    );
  }

  @Get('status')
  @ApiOperation({ summary: '检查钱包连接状态' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        connected: { type: 'boolean', example: true },
        walletAddress: { type: 'string', example: '0x1234567890123456789012345678901234567890' },
        verifiedAt: { type: 'string', format: 'date-time', nullable: true }
      }
    }
  })
  @ApiQuery({ 
    name: 'walletAddress', 
    type: String, 
    example: '0x1234567890123456789012345678901234567890' 
  })
  async getWalletStatus(@Query('walletAddress') walletAddress: string) {
    return this.walletVerificationService.checkWalletStatus(walletAddress);
  }
}