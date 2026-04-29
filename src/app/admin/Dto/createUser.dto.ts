import { Role } from '@prisma/client';

export class CreateUserDto {
  username: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
}
