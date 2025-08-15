import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service';

@ApiTags('Health Check')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2023-12-01T10:00:00.000Z' },
        uptime: { type: 'number', example: 12345 },
        database: { type: 'string', example: 'connected' },
        version: { type: 'string', example: '1.0.0' }
      }
    }
  })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async healthCheck() {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected',
        error: error.message,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };
    }
  }

  @Get('/')
  @ApiOperation({ summary: 'Root endpoint' })
  @ApiResponse({ 
    status: 200, 
    description: 'API information',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Dolly Vibe API' },
        version: { type: 'string', example: '1.0.0' },
        description: { type: 'string', example: 'Dolly Vibe Backend API' },
        docs: { type: 'string', example: '/api' }
      }
    }
  })
  getRoot() {
    return {
      name: 'Dolly Vibe API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Dolly Vibe Backend API with user management, authentication, and social integrations',
      docs: '/api',
      timestamp: new Date().toISOString()
    };
  }
}