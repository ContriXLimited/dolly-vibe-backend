import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { createId } from '@paralleldrive/cuid2';
import { CreateProfileUpdateDto } from './dto/create-profile-update.dto';
import { QueryProfileUpdateDto } from './dto/query-profile-update.dto';
import { QueryScoreRecordDto } from './dto/query-score-record.dto';
import {
  ProfileUpdateRecord,
  ScoreRecord,
  ScoreRecordType,
  Prisma,
} from '@prisma/client';

@Injectable()
export class ProfileUpdateService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => LeaderboardService))
    private leaderboardService: LeaderboardService,
  ) {}

  async createProfileUpdate(dto: CreateProfileUpdateDto): Promise<ProfileUpdateRecord> {
    const {
      userId,
      vibePassId,
      messageIds,
      newProfile,
      newScore,
      newParams,
      newTags,
      newRootHash,
    } = dto;

    // 验证必须有 userId 或 vibePassId 其中之一
    if (!userId && !vibePassId) {
      throw new BadRequestException('Either userId or vibePassId must be provided');
    }

    if (userId && vibePassId) {
      throw new BadRequestException('Cannot provide both userId and vibePassId');
    }

    // 如果提供了 userId，验证 User 是否存在
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
    }

    // 如果提供了 vibePassId，验证 VibePass 是否存在
    let vibePass: any = null;
    if (vibePassId) {
      vibePass = await this.prisma.vibePass.findUnique({
        where: { id: vibePassId },
      });

      if (!vibePass) {
        throw new NotFoundException(`VibePass with ID ${vibePassId} not found`);
      }
    }

    // 使用事务来确保数据一致性
    const result = await this.prisma.$transaction(async (prisma) => {
      // 创建 ProfileUpdateRecord
      const profileUpdateRecord = await prisma.profileUpdateRecord.create({
        data: {
          id: createId(),
          userId,
          vibePassId,
          messageIds: JSON.stringify(messageIds),
          newProfile,
          newScore: newScore ? new Prisma.Decimal(newScore) : null,
          newParams: newParams ? JSON.stringify(newParams) : null,
          newTags: newTags ? JSON.stringify(newTags) : null,
          newRootHash,
        },
      });

      // 如果是 VibePass 更新且有新积分，处理积分变更
      if (vibePass && newScore !== undefined) {
        const oldScore = vibePass.score.toNumber();
        const scoreChange = newScore - oldScore;

        // 如果积分有变化，创建 ScoreRecord
        if (scoreChange !== 0) {
          const scoreRecord = await prisma.scoreRecord.create({
            data: {
              id: createId(),
              vibePassId,
              value: new Prisma.Decimal(scoreChange),
              type: ScoreRecordType.PROFILE_UPDATE,
              updateRecordId: profileUpdateRecord.id,
            },
          });

          // 更新 VibePass 的积分和其他数据
          await prisma.vibePass.update({
            where: { id: vibePassId },
            data: {
              score: new Prisma.Decimal(newScore),
              params: newParams ? JSON.stringify(newParams) : undefined,
              tags: newTags ? JSON.stringify(newTags) : undefined,
              rootHash: newRootHash || undefined,
            },
          });

          // 提交事务后更新排行榜
          return { profileUpdateRecord, scoreRecord };
        } else {
          // 即使积分没变化，也要更新其他数据
          await prisma.vibePass.update({
            where: { id: vibePassId },
            data: {
              params: newParams ? JSON.stringify(newParams) : undefined,
              tags: newTags ? JSON.stringify(newTags) : undefined,
              rootHash: newRootHash || undefined,
            },
          });
        }
      }

      // 如果是普通 User 更新，更新 User 的 profile
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            profile: newProfile,
          },
        });
      }

      return { profileUpdateRecord };
    });

    // 如果创建了 ScoreRecord，异步更新排行榜
    if ('scoreRecord' in result) {
      try {
        await this.leaderboardService.updateLeaderboardScores(result.scoreRecord);
      } catch (error) {
        // 记录错误但不影响主流程
        console.error('Failed to update leaderboard:', error);
      }
    }

    return result.profileUpdateRecord;
  }

  async findProfileUpdates(dto: QueryProfileUpdateDto) {
    const { userId, vibePassId, page = 1, limit = 20 } = dto;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    if (vibePassId) {
      where.vibePassId = vibePassId;
    }

    const [records, total] = await Promise.all([
      this.prisma.profileUpdateRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.profileUpdateRecord.count({ where }),
    ]);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findScoreRecords(vibePassId: string, dto: QueryScoreRecordDto) {
    const { page = 1, limit = 20 } = dto;

    // 验证 VibePass 是否存在
    const vibePass = await this.prisma.vibePass.findUnique({
      where: { id: vibePassId },
    });

    if (!vibePass) {
      throw new NotFoundException(`VibePass with ID ${vibePassId} not found`);
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.scoreRecord.findMany({
        where: { vibePassId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.scoreRecord.count({ where: { vibePassId } }),
    ]);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProfileUpdateById(id: string): Promise<ProfileUpdateRecord> {
    const record = await this.prisma.profileUpdateRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`ProfileUpdateRecord with ID ${id} not found`);
    }

    return record;
  }

  async getScoreRecordById(id: string): Promise<ScoreRecord> {
    const record = await this.prisma.scoreRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`ScoreRecord with ID ${id} not found`);
    }

    return record;
  }
}