import { SetMetadata } from '@nestjs/common';
import { ClientProjectRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ClientProjectRole[]) => SetMetadata(ROLES_KEY, roles);