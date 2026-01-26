import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface JwtPayload {
  sub: string;
  userId: string;
  role: string;
  workspaceId: string;
}
export const User = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return null;

    return data ? user[data] : user;
  },
);
