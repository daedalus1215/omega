import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../infra/repositories/user.repository';

export type UserProjection = {
  id: number;
  username: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class UserAggregator {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Find user by username for authentication purposes.
   * Returns the full user entity including password for validation.
   */
  async findByUsernameForAuth(username: string): Promise<{
    id: number;
    username: string;
    password: string;
    createdAt: string;
    updatedAt: string;
  } | null> {
    return this.userRepository.findByUsername(username);
  }

  /**
   * Find user by ID.
   * Returns user projection without password.
   */
  async findById(id: number): Promise<UserProjection | null> {
    const user = await this.userRepository.findById(id.toString());
    if (!user) {
      return null;
    }
    const { password: _, ...projection } = user;
    return projection;
  }

  /**
   * Find user by ID and return username.
   * Used for cross-domain operations that need user identification.
   */
  async findUsernameById(id: number): Promise<string | null> {
    const user = await this.userRepository.findById(id.toString());
    if (!user) {
      return null;
    }
    return user.username;
  }
}
