import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { VibeUser, VibeUserStatus, Prisma } from '@prisma/client';
import { CreateVibeUserDto } from './dto/create-vibe-user.dto';
import { UpdateVibeUserDto } from './dto/update-vibe-user.dto';
import { QueryVibeUserDto } from './dto/query-vibe-user.dto';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class VibeUserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVibeUserDto: CreateVibeUserDto): Promise<VibeUser> {
    const { discordId, twitterId, ...rest } = createVibeUserDto;

    if (discordId) {
      const existingByDiscord = await this.prisma.vibeUser.findFirst({
        where: { discordId },
      });
      if (existingByDiscord) {
        throw new ConflictException('Discord ID already exists');
      }
    }

    if (twitterId) {
      const existingByTwitter = await this.prisma.vibeUser.findFirst({
        where: { twitterId },
      });
      if (existingByTwitter) {
        throw new ConflictException('Twitter ID already exists');
      }
    }

    return this.prisma.vibeUser.create({
      data: {
        id: createId(),
        discordId,
        twitterId,
        isJoined: rest.isJoined ?? false,
        isFollowed: rest.isFollowed ?? false,
        status: rest.status ?? VibeUserStatus.NORMAL,
      },
    });
  }

  async findAll(queryDto: QueryVibeUserDto) {
    const { page = 1, limit = 10, ...filters } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.VibeUserWhereInput = {};
    
    if (filters.discordId) {
      where.discordId = { contains: filters.discordId };
    }
    if (filters.twitterId) {
      where.twitterId = { contains: filters.twitterId };
    }
    if (filters.isJoined !== undefined) {
      where.isJoined = filters.isJoined;
    }
    if (filters.isFollowed !== undefined) {
      where.isFollowed = filters.isFollowed;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const [users, total] = await Promise.all([
      this.prisma.vibeUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vibeUser.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<VibeUser> {
    const user = await this.prisma.vibeUser.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('VibeUser not found');
    }

    return user;
  }

  async findByDiscordId(discordId: string): Promise<VibeUser | null> {
    return this.prisma.vibeUser.findFirst({
      where: { discordId },
    });
  }

  async findByTwitterId(twitterId: string): Promise<VibeUser | null> {
    return this.prisma.vibeUser.findFirst({
      where: { twitterId },
    });
  }

  async findByUserId(userId: string): Promise<any> {
    // Find VibePass records that link to this User ID
    const vibePass = await this.prisma.vibePass.findFirst({
      where: { userId },
    });

    if (!vibePass) {
      throw new NotFoundException(`No VibeUser found for User ID: ${userId}`);
    }

    // Fetch related data separately
    const [vibeUser, vibeProject] = await Promise.all([
      this.prisma.vibeUser.findUnique({
        where: { id: vibePass.vibeUserId },
      }),
      this.prisma.vibeProject.findUnique({
        where: { id: vibePass.vibeProjectId },
      }),
    ]);

    return {
      vibeUser,
      vibePass: {
        id: vibePass.id,
        vibeProjectId: vibePass.vibeProjectId,
        score: vibePass.score,
        status: vibePass.status,
        createdAt: vibePass.createdAt,
        updatedAt: vibePass.updatedAt,
      },
      vibeProject,
    };
  }

  async update(id: string, updateVibeUserDto: UpdateVibeUserDto): Promise<VibeUser> {
    const existingUser = await this.findOne(id);

    const { discordId, twitterId, ...rest } = updateVibeUserDto;

    if (discordId && discordId !== existingUser.discordId) {
      const existingByDiscord = await this.prisma.vibeUser.findFirst({
        where: { discordId, id: { not: id } },
      });
      if (existingByDiscord) {
        throw new ConflictException('Discord ID already exists');
      }
    }

    if (twitterId && twitterId !== existingUser.twitterId) {
      const existingByTwitter = await this.prisma.vibeUser.findFirst({
        where: { twitterId, id: { not: id } },
      });
      if (existingByTwitter) {
        throw new ConflictException('Twitter ID already exists');
      }
    }

    return this.prisma.vibeUser.update({
      where: { id },
      data: {
        discordId,
        twitterId,
        ...rest,
      },
    });
  }

  async remove(id: string): Promise<VibeUser> {
    await this.findOne(id);

    return this.prisma.vibeUser.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: VibeUserStatus): Promise<VibeUser> {
    await this.findOne(id);

    return this.prisma.vibeUser.update({
      where: { id },
      data: { status },
    });
  }

  async updateSocialStatus(
    id: string,
    updates: { isJoined?: boolean; isFollowed?: boolean },
  ): Promise<VibeUser> {
    await this.findOne(id);

    return this.prisma.vibeUser.update({
      where: { id },
      data: updates,
    });
  }

  async getStatistics() {
    const [
      totalUsers,
      normalUsers,
      blacklistedUsers,
      joinedUsers,
      followedUsers,
      bothJoinedAndFollowed,
    ] = await Promise.all([
      this.prisma.vibeUser.count(),
      this.prisma.vibeUser.count({ where: { status: VibeUserStatus.NORMAL } }),
      this.prisma.vibeUser.count({ where: { status: VibeUserStatus.BLACKLIST } }),
      this.prisma.vibeUser.count({ where: { isJoined: true } }),
      this.prisma.vibeUser.count({ where: { isFollowed: true } }),
      this.prisma.vibeUser.count({
        where: { isJoined: true, isFollowed: true },
      }),
    ]);

    return {
      totalUsers,
      normalUsers,
      blacklistedUsers,
      joinedUsers,
      followedUsers,
      bothJoinedAndFollowed,
    };
  }
}