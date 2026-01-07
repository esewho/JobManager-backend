import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      userId: string;
      role: Role;
    }
  }
}

export {};
