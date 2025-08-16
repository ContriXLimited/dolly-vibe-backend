import { PrismaClient, VibeProjectStatus } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

interface CreateVibeProjectData {
  projectId: string;
  score?: number;
  status?: VibeProjectStatus;
}

async function createVibeProject(data: CreateVibeProjectData) {
  try {
    // 检查是否已存在该项目的 VibeProject
    const existingVibeProject = await prisma.vibeProject.findFirst({
      where: { projectId: data.projectId },
    });

    if (existingVibeProject) {
      console.log(`VibeProject for project ${data.projectId} already exists:`, existingVibeProject);
      return existingVibeProject;
    }

    // 验证对应的 Project 是否存在
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new Error(`Project with ID ${data.projectId} does not exist`);
    }

    // 创建 VibeProject
    const vibeProject = await prisma.vibeProject.create({
      data: {
        id: createId(),
        projectId: data.projectId,
        score: data.score || 0,
        status: data.status || VibeProjectStatus.NORMAL,
      },
    });

    console.log('VibeProject created successfully:', vibeProject);
    console.log('Project details:', {
      name: project.name,
      introduction: project.introduction,
    });

    return vibeProject;
  } catch (error) {
    console.error('Error creating VibeProject:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 脚本执行入口
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run script:create-vibe-project <projectId> [score] [status]');
    console.log('Example: npm run script:create-vibe-project "project-123" 100 NORMAL');
    process.exit(1);
  }

  const projectId = args[0];
  const score = args[1] ? parseFloat(args[1]) : undefined;
  const status = args[2] as VibeProjectStatus || undefined;

  await createVibeProject({
    projectId,
    score,
    status,
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  const dotenv = require('dotenv');

  dotenv.config();

  main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { createVibeProject };