import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../user/entities/user.entity';

@Injectable()
export class DefaultUsersSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(DefaultUsersSeed.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  /**
   * Seed default users when the table is empty.
   * Uses a map so it is easy to extend/override.
   */
  async onApplicationBootstrap(): Promise<void> {
    const count = await this.userRepository.count();
    if (count > 0) {
      return;
    }

    const seedUsers: {
      [key: string]: {
        email: string;
        password: string;
        nickname: string;
        role: UserRole;
      };
    } = {
      admin: {
        email: 'admin@example.com',
        password: 'ChangeMe123!',
        nickname: 'Admin',
        role: UserRole.ADMIN,
      },
      user: {
        email: 'user@example.com',
        password: 'ChangeMe123!',
        nickname: 'User',
        role: UserRole.USER,
      },
    };

    for (const [key, def] of Object.entries(seedUsers)) {
      const passwordHash = await bcrypt.hash(def.password, 10);
      await this.userRepository.save({
        email: def.email,
        passwordHash,
        nickname: def.nickname,
        role: def.role,
      });
      this.logger.warn(
        `Seeded default ${key} (${def.role}): ${def.email} (please change password)`,
      );
    }
  }
}
