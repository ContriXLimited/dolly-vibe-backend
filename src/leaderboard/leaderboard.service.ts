import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { QueryLeaderboardDto, TimeWindow } from './dto/query-leaderboard.dto';
import { ScoreRecord, ScoreRecordType } from '@prisma/client';

@Injectable()
export class LeaderboardService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // Redis Key 生成方法
  private getLeaderboardKey(projectId: string, timeWindow: TimeWindow): string {
    return `vibe:leaderboard:${projectId}:${timeWindow}`;
  }

  private getGlobalLeaderboardKey(timeWindow: TimeWindow): string {
    return `vibe:leaderboard:global:${timeWindow}`;
  }

  private getLastUpdateKey(projectId: string): string {
    return `vibe:leaderboard:last_update:${projectId}`;
  }

  private getGlobalLastUpdateKey(): string {
    return `vibe:leaderboard:last_update:global`;
  }

  // 更新排行榜积分（在 ScoreRecord 创建时调用）
  async updateLeaderboardScores(scoreRecord: ScoreRecord): Promise<void> {
    const redis = this.redis.getClient();
    
    // 获取 VibePass 信息
    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id: scoreRecord.vibePassId },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${scoreRecord.vibePassId} not found`);
    }

    // 获取 VibeProject 信息
    const vibeProject = await this.prisma.vibeProject.findUnique({
      where: { id: vibePass.vibeProjectId },
    });

    if (!vibeProject) {
      throw new NotFoundException(`VibeProject with ID ${vibePass.vibeProjectId} not found`);
    }

    const currentTime = new Date();
    const scoreChange = scoreRecord.value.toNumber();

    // 更新项目内排行榜
    await this.updateProjectLeaderboards(
      redis,
      vibeProject.id,
      vibePass.id,
      scoreChange,
      currentTime,
    );

    // 更新全局排行榜
    await this.updateGlobalLeaderboards(
      redis,
      vibePass.id,
      scoreChange,
      currentTime,
    );
  }

  private async updateProjectLeaderboards(
    redis: any,
    projectId: string,
    vibePassId: string,
    scoreChange: number,
    currentTime: Date,
  ): Promise<void> {
    const lastUpdateKey = this.getLastUpdateKey(projectId);
    const lastUpdateTime = await redis.get(lastUpdateKey);
    const lastUpdate = lastUpdateTime ? new Date(lastUpdateTime) : null;

    // 检查并更新各个时间窗口的排行榜
    for (const timeWindow of [TimeWindow.DAILY, TimeWindow.WEEKLY, TimeWindow.ALL]) {
      const leaderboardKey = this.getLeaderboardKey(projectId, timeWindow);
      
      if (this.shouldResetLeaderboard(timeWindow, lastUpdate, currentTime)) {
        // 需要重置排行榜
        await this.snapshotAndResetLeaderboard(redis, leaderboardKey, timeWindow, projectId);
      }

      // 更新积分
      await redis.zincrby(leaderboardKey, scoreChange, vibePassId);
    }

    // 更新最后更新时间
    await redis.set(lastUpdateKey, currentTime.toISOString());
  }

  private async updateGlobalLeaderboards(
    redis: any,
    vibePassId: string,
    scoreChange: number,
    currentTime: Date,
  ): Promise<void> {
    const lastUpdateKey = this.getGlobalLastUpdateKey();
    const lastUpdateTime = await redis.get(lastUpdateKey);
    const lastUpdate = lastUpdateTime ? new Date(lastUpdateTime) : null;

    // 检查并更新各个时间窗口的全局排行榜
    for (const timeWindow of [TimeWindow.DAILY, TimeWindow.WEEKLY, TimeWindow.ALL]) {
      const leaderboardKey = this.getGlobalLeaderboardKey(timeWindow);
      
      if (this.shouldResetLeaderboard(timeWindow, lastUpdate, currentTime)) {
        // 需要重置排行榜
        await this.snapshotAndResetLeaderboard(redis, leaderboardKey, timeWindow, 'global');
      }

      // 更新积分
      await redis.zincrby(leaderboardKey, scoreChange, vibePassId);
    }

    // 更新最后更新时间
    await redis.set(lastUpdateKey, currentTime.toISOString());
  }

  private shouldResetLeaderboard(
    timeWindow: TimeWindow,
    lastUpdate: Date | null,
    currentTime: Date,
  ): boolean {
    if (!lastUpdate) return false;

    switch (timeWindow) {
      case TimeWindow.DAILY:
        // 检查是否跨天
        return lastUpdate.getDate() !== currentTime.getDate() ||
               lastUpdate.getMonth() !== currentTime.getMonth() ||
               lastUpdate.getFullYear() !== currentTime.getFullYear();
      
      case TimeWindow.WEEKLY:
        // 检查是否跨周
        const lastWeekStart = this.getWeekStart(lastUpdate);
        const currentWeekStart = this.getWeekStart(currentTime);
        return lastWeekStart.getTime() !== currentWeekStart.getTime();
      
      case TimeWindow.ALL:
        // 全部排行榜不需要重置
        return false;
      
      default:
        return false;
    }
  }

  private getWeekStart(date: Date): Date {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private async snapshotAndResetLeaderboard(
    redis: any,
    leaderboardKey: string,
    timeWindow: TimeWindow,
    identifier: string,
  ): Promise<void> {
    // 创建快照
    const snapshotKey = `${leaderboardKey}:snapshot:${Date.now()}`;
    
    // 获取当前排行榜数据
    const leaderboardData = await redis.zrevrange(leaderboardKey, 0, -1, 'WITHSCORES');
    
    if (leaderboardData.length > 0) {
      // 保存快照（可以添加元数据）
      const snapshotMetadata = {
        type: timeWindow,
        identifier,
        timestamp: new Date().toISOString(),
        count: leaderboardData.length / 2, // WITHSCORES 返回 member, score 对
      };
      
      await redis.hset(`${snapshotKey}:meta`, snapshotMetadata);
      
      // 保存排行榜数据
      if (leaderboardData.length > 0) {
        await redis.zadd(snapshotKey, ...leaderboardData);
      }
      
      // 设置快照过期时间（例如保存30天）
      await redis.expire(snapshotKey, 30 * 24 * 60 * 60);
      await redis.expire(`${snapshotKey}:meta`, 30 * 24 * 60 * 60);
    }

    // 清空当前排行榜
    await redis.del(leaderboardKey);
  }

  // 获取项目排行榜
  async getProjectLeaderboard(vibeProjectId: string, dto: QueryLeaderboardDto) {
    const { timeWindow = TimeWindow.ALL, page = 1, limit = 50 } = dto;

    // 验证 VibeProject 是否存在
    const vibeProject = await this.prisma.vibeProject.findUnique({
      where: { id: vibeProjectId },
    });

    if (!vibeProject) {
      throw new NotFoundException(`VibeProject with ID ${vibeProjectId} not found`);
    }

    const redis = this.redis.getClient();
    const leaderboardKey = this.getLeaderboardKey(vibeProjectId, timeWindow);
    
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    // 从 Redis 获取排行榜数据
    const leaderboardData = await redis.zrevrange(
      leaderboardKey,
      start,
      stop,
      'WITHSCORES',
    );

    // 获取总数
    const total = await redis.zcard(leaderboardKey);

    // 格式化数据
    const formattedData = [];
    for (let i = 0; i < leaderboardData.length; i += 2) {
      const vibePassId = leaderboardData[i];
      const score = parseFloat(leaderboardData[i + 1]);
      const rank = start + (i / 2) + 1;

      // 获取 VibePass 详细信息
      const vibePass = await this.prisma.vibePass.findUnique({
        where: { id: vibePassId },
        select: {
          id: true,
          vibeUserId: true,
          userId: true,
          params: true,
          tags: true,
          tokenId: true,
          createdAt: true,
        },
      });

      if (vibePass) {
        // 获取对应的 User 信息
        const user = await this.prisma.user.findUnique({
          where: { id: vibePass.userId },
          select: { name: true },
        });

        // 计算昨日积分变化量
        const yesterdayChange = await this.getYesterdayScoreChange(vibePassId);
        
        formattedData.push({
          ...vibePass,
          rank,
          score,
          yesterdayChange,
          userName: user?.name || null,
          params: vibePass.params ? JSON.parse(vibePass.params) : null,
          tags: vibePass.tags ? JSON.parse(vibePass.tags) : null,
        });
      }
    }

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timeWindow,
      vibeProjectId,
    };
  }

  // 获取全局排行榜
  async getGlobalLeaderboard(dto: QueryLeaderboardDto) {
    const { timeWindow = TimeWindow.ALL, page = 1, limit = 50 } = dto;

    const redis = this.redis.getClient();
    const leaderboardKey = this.getGlobalLeaderboardKey(timeWindow);
    
    const start = (page - 1) * limit;
    const stop = start + limit - 1;

    // 从 Redis 获取排行榜数据
    const leaderboardData = await redis.zrevrange(
      leaderboardKey,
      start,
      stop,
      'WITHSCORES',
    );

    // 获取总数
    const total = await redis.zcard(leaderboardKey);

    // 格式化数据
    const formattedData = [];
    for (let i = 0; i < leaderboardData.length; i += 2) {
      const vibePassId = leaderboardData[i];
      const score = parseFloat(leaderboardData[i + 1]);
      const rank = start + (i / 2) + 1;

      // 获取 VibePass 详细信息
      const vibePass = await this.prisma.vibePass.findUnique({
        where: { id: vibePassId },
        select: {
          id: true,
          vibeUserId: true,
          vibeProjectId: true,
          userId: true,
          params: true,
          tags: true,
          tokenId: true,
          createdAt: true,
        },
      });

      if (vibePass) {
        // 获取对应的 User 信息
        const user = await this.prisma.user.findUnique({
          where: { id: vibePass.userId },
          select: { name: true },
        });

        // 计算昨日积分变化量
        const yesterdayChange = await this.getYesterdayScoreChange(vibePassId);
        
        formattedData.push({
          ...vibePass,
          rank,
          score,
          yesterdayChange,
          userName: user?.name || null,
          params: vibePass.params ? JSON.parse(vibePass.params) : null,
          tags: vibePass.tags ? JSON.parse(vibePass.tags) : null,
        });
      }
    }

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timeWindow,
      type: 'global',
    };
  }

  // 获取用户在项目中的排名
  async getUserRank(vibeProjectId: string, vibePassId: string, timeWindow: TimeWindow = TimeWindow.ALL) {
    // 验证 VibeProject 和 VibePass
    const vibeProject = await this.prisma.vibeProject.findUnique({
      where: { id: vibeProjectId },
    });

    if (!vibeProject) {
      throw new NotFoundException(`VibeProject with ID ${vibeProjectId} not found`);
    }

    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id: vibePassId },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${vibePassId} not found`);
    }

    if (vibePass.vibeProjectId !== vibeProjectId) {
      throw new BadRequestException('VibePass does not belong to the specified project');
    }

    const redis = this.redis.getClient();
    const leaderboardKey = this.getLeaderboardKey(vibeProjectId, timeWindow);

    // 获取用户排名和积分
    const rank = await redis.zrevrank(leaderboardKey, vibePassId);
    const score = await redis.zscore(leaderboardKey, vibePassId);
    const totalParticipants = await redis.zcard(leaderboardKey);

    return {
      vibePassId,
      vibeProjectId,
      rank: rank !== null ? rank + 1 : null, // Redis rank 从 0 开始
      totalParticipants,
      score: score ? parseFloat(score) : 0,
      percentile: rank !== null && totalParticipants > 0 
        ? ((totalParticipants - rank) / totalParticipants * 100) 
        : 0,
      timeWindow,
    };
  }

  // 获取用户全局排名
  async getGlobalUserRank(vibePassId: string, timeWindow: TimeWindow = TimeWindow.ALL) {
    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id: vibePassId },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${vibePassId} not found`);
    }

    const redis = this.redis.getClient();
    const leaderboardKey = this.getGlobalLeaderboardKey(timeWindow);

    // 获取用户排名和积分
    const rank = await redis.zrevrank(leaderboardKey, vibePassId);
    const score = await redis.zscore(leaderboardKey, vibePassId);
    const totalParticipants = await redis.zcard(leaderboardKey);

    return {
      vibePassId,
      rank: rank !== null ? rank + 1 : null, // Redis rank 从 0 开始
      totalParticipants,
      score: score ? parseFloat(score) : 0,
      percentile: rank !== null && totalParticipants > 0 
        ? ((totalParticipants - rank) / totalParticipants * 100) 
        : 0,
      timeWindow,
      type: 'global',
    };
  }

  // 计算昨日积分变化量
  private async getYesterdayScoreChange(vibePassId: string): Promise<number> {
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(now.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // 获取昨日的积分变化记录
    const scoreChanges = await this.prisma.scoreRecord.findMany({
      where: {
        vibePassId,
        createdAt: {
          gte: yesterdayStart,
          lte: yesterdayEnd,
        },
      },
    });

    // 计算总变化量
    return scoreChanges.reduce((total, record) => {
      return total + record.value.toNumber();
    }, 0);
  }

  // 获取最近X天的历史积分曲线
  async getScoreHistory(vibePassId: string, days: number = 7) {
    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id: vibePassId },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${vibePassId} not found`);
    }

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 获取历史积分记录
    const scoreRecords = await this.prisma.scoreRecord.findMany({
      where: {
        vibePassId,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 构建每日积分曲线
    const dailyScores = [];
    let currentScore = vibePass.score.toNumber();
    
    // 从最新积分开始，倒推历史积分
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      // 计算这一天的积分变化
      const dayChanges = scoreRecords.filter(record => {
        const recordDate = new Date(record.createdAt);
        return recordDate >= date && recordDate < nextDate;
      });
      
      const dayChange = dayChanges.reduce((sum, record) => sum + record.value.toNumber(), 0);
      
      // 如果是今天，使用当前积分；否则计算历史积分
      const dayScore = i === 0 ? currentScore : currentScore - dayChange;
      
      dailyScores.unshift({
        date: date.toISOString().split('T')[0],
        score: dayScore,
        change: dayChange,
        changeCount: dayChanges.length,
      });
      
      // 为下一次迭代更新当前积分
      if (i < days - 1) {
        currentScore = dayScore;
      }
    }

    return {
      vibePassId,
      days,
      currentScore: vibePass.score.toNumber(),
      history: dailyScores,
      totalChange: dailyScores.reduce((sum, day) => sum + day.change, 0),
    };
  }

  // 获取项目的历史积分曲线
  async getProjectScoreHistory(vibeProjectId: string, days: number = 7) {
    const vibeProject = await this.prisma.vibeProject.findUnique({
      where: { id: vibeProjectId },
    });

    if (!vibeProject) {
      throw new NotFoundException(`VibeProject with ID ${vibeProjectId} not found`);
    }

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 获取项目内所有用户的积分记录
    const scoreRecords = await this.prisma.scoreRecord.findMany({
      where: {
        vibeProjectId,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 构建每日项目总积分曲线
    const dailyScores = [];
    let currentTotalScore = vibeProject.score.toNumber();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      // 计算这一天的项目积分变化
      const dayChanges = scoreRecords.filter(record => {
        const recordDate = new Date(record.createdAt);
        return recordDate >= date && recordDate < nextDate;
      });
      
      const dayChange = dayChanges.reduce((sum, record) => sum + record.value.toNumber(), 0);
      const dayScore = i === 0 ? currentTotalScore : currentTotalScore - dayChange;
      
      dailyScores.unshift({
        date: date.toISOString().split('T')[0],
        score: dayScore,
        change: dayChange,
        changeCount: dayChanges.length,
        userChanges: dayChanges.length, // 参与积分变化的用户数量
      });
      
      if (i < days - 1) {
        currentTotalScore = dayScore;
      }
    }

    return {
      vibeProjectId,
      days,
      currentScore: vibeProject.score.toNumber(),
      history: dailyScores,
      totalChange: dailyScores.reduce((sum, day) => sum + day.change, 0),
    };
  }
}