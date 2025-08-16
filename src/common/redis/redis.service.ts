import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  /**
   * Check project refresh limit
   * @param projectId Project ID
   * @returns Current trigger count
   */
  async checkRefreshLimit(projectId: string): Promise<number> {
    const key = `refresh_limit:${projectId}`;
    const count = await this.client.llen(key);
    return count;
  }

  /**
   * Add refresh record
   * @param projectId Project ID
   * @returns Total count after addition
   */
  async addRefreshRecord(projectId: string): Promise<number> {
    const key = `refresh_limit:${projectId}`;
    const timestamp = Date.now();

    // Add record
    await this.client.lpush(key, timestamp.toString());

    // Set 24-hour expiration
    await this.client.expire(key, 24 * 60 * 60);

    // Return current total count
    return await this.client.llen(key);
  }

  /**
   * Publish refresh message to channel
   * @param projectId Project ID
   * @param requestId Request ID
   */
  async publishRefreshMessage(
    projectId: string,
    requestId: string,
  ): Promise<void> {
    const channel = 'topics_questions_refresh';
    const message = JSON.stringify({
      projectId,
      timestamp: Date.now(),
      requestId,
      type: 'topics_questions_refresh',
    });

    await this.client.publish(channel, message);
  }

  /**
   * Check if project is processing refresh
   * @param projectId Project ID
   * @returns Whether currently processing
   */
  async isProcessing(projectId: string): Promise<boolean> {
    const key = `refresh_status:${projectId}`;
    const value = await this.client.get(key);

    if (!value) {
      return false;
    }

    try {
      const statusData = JSON.parse(value);
      return statusData.status === 'processing';
    } catch {
      return false;
    }
  }

  /**
   * Set project refresh status to processing
   * @param projectId Project ID
   * @param requestId Request ID
   * @param ttl Expiration time (seconds), default 30 minutes
   */
  async setProcessing(
    projectId: string,
    requestId: string,
    ttl: number = 30 * 60,
  ): Promise<void> {
    const key = `refresh_status:${projectId}`;
    const value = JSON.stringify({
      status: 'processing',
      requestId,
      startTime: Date.now(),
    });

    await this.client.setex(key, ttl, value);
  }

  /**
   * Set project refresh status to completed
   * @param projectId Project ID
   * @param requestId Request ID
   */
  async setCompleted(projectId: string, requestId: string): Promise<void> {
    const key = `refresh_status:${projectId}`;
    const value = JSON.stringify({
      status: 'completed',
      requestId,
      completedTime: Date.now(),
    });

    // Set shorter expiration time, auto cleanup after 5 minutes
    await this.client.setex(key, 5 * 60, value);
  }

  /**
   * Set project refresh status to failed
   * @param projectId Project ID
   * @param requestId Request ID
   * @param error Error message
   */
  async setFailed(
    projectId: string,
    requestId: string,
    error?: string,
  ): Promise<void> {
    const key = `refresh_status:${projectId}`;
    const value = JSON.stringify({
      status: 'failed',
      requestId,
      failedTime: Date.now(),
      error: error || 'Unknown error',
    });

    // Set shorter expiration time, auto cleanup after 5 minutes
    await this.client.setex(key, 5 * 60, value);
  }

  /**
   * Get project refresh status
   * @param projectId Project ID
   * @returns Status information
   */
  async getRefreshStatus(projectId: string): Promise<any> {
    const key = `refresh_status:${projectId}`;
    const value = await this.client.get(key);

    if (!value) {
      return { status: 'idle' };
    }

    try {
      return JSON.parse(value);
    } catch {
      return { status: 'idle' };
    }
  }

  /**
   * Clear project refresh status
   * @param projectId Project ID
   */
  async clearRefreshStatus(projectId: string): Promise<void> {
    const key = `refresh_status:${projectId}`;
    await this.client.del(key);
  }
}
