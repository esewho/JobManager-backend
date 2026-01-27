import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { prisma } from '../../../prisma/prisma';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    workspaceId?: string;
  };
  params: {
    workspaceId?: string;
  };
}

@Injectable()
export class WorkspaceGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const { userId } = req.user;
    const workspaceId = req.params.workspaceId ?? req.user.workspaceId;

    if (!workspaceId) return false;

    if (!workspaceId) {
      return false;
    }
    const membership = await prisma.userWorkspace.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });
    return !!membership;
  }
}
