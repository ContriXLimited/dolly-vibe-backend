import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('Attempting to connect to database...');
      
      // Set connection timeout
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout (10s)')), 10000)
        )
      ]);
      
      this.logger.log('Successfully connected to database');
      
      // Test the connection
      await this.$queryRaw`SELECT 1`;
      this.logger.log('Database connection test successful');
      
    } catch (error) {
      this.logger.error('Failed to connect to database:', error.message);
      this.logger.error('Database URL:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@'));
      
      // Don't throw error to allow app to start (for development)
      this.logger.warn('Application will continue without database connection');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}