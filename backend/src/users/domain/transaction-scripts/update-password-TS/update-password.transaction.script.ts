import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from '../../../infra/repositories/user.repository';
import { UpdatePasswordCommand } from './update-password.command';
import * as bcrypt from 'bcrypt';

/**
 * Transaction script for updating user password.
 * Verifies current password and hashes new password.
 */
@Injectable()
export class UpdatePasswordTransactionScript {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Update user password.
   * Validates current password and updates to new password.
   */
  async apply(command: UpdatePasswordCommand): Promise<void> {
    const { userId, currentPassword, newPassword, user } = command;

    // Verify user is updating their own account
    if (user.userId !== userId) {
      throw new UnauthorizedException("Cannot update another user's account");
    }

    // Validate new password format (6-50 chars, matching CreateUserDto)
    if (!newPassword || newPassword.length < 6 || newPassword.length > 50) {
      throw new Error('Password must be between 6 and 50 characters');
    }

    // Get user with password
    const userWithPassword = await this.userRepository.findById(userId);
    if (!userWithPassword) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      userWithPassword.password
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(
      newPassword,
      userWithPassword.password
    );
    if (isSamePassword) {
      throw new Error('New password must be different from current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.userRepository.update(userId, {
      password: hashedPassword,
    });
  }
}
