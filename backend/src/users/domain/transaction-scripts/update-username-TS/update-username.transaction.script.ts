import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from '../../../infra/repositories/user.repository';
import { UpdateUsernameCommand } from './update-username.command';
import { User } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { omit } from 'lodash';

/**
 * Transaction script for updating user username.
 * Validates username format, uniqueness, and verifies current password.
 */
@Injectable()
export class UpdateUsernameTransactionScript {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Update user username.
   * Validates business rules and updates the username.
   */
  async apply(command: UpdateUsernameCommand): Promise<Omit<User, 'password'>> {
    const { userId, newUsername, currentPassword, user } = command;

    // Verify user is updating their own account
    if (user.userId !== userId) {
      throw new UnauthorizedException("Cannot update another user's account");
    }

    // Validate username format (4-20 chars, matching CreateUserDto)
    if (
      !newUsername ||
      newUsername.trim().length < 4 ||
      newUsername.trim().length > 20
    ) {
      throw new Error('Username must be between 4 and 20 characters');
    }

    const trimmedUsername = newUsername.trim();

    // Check if new username is different from current
    const currentUser = await this.userRepository.findById(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    if (currentUser.username === trimmedUsername) {
      throw new Error('New username must be different from current username');
    }

    // Check username uniqueness (excluding current user)
    const existingUser =
      await this.userRepository.findByUsername(trimmedUsername);
    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Username already exists');
    }

    // Verify current password
    const userWithPassword = await this.userRepository.findById(userId);
    if (!userWithPassword) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      userWithPassword.password
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Update username
    const updatedUser = await this.userRepository.update(userId, {
      username: trimmedUsername,
    });

    return omit(updatedUser, ['password']);
  }
}
