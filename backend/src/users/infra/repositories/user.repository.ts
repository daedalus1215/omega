import { Repository } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>
  ) {}

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({ where: { username } });
  }

  async findById(id: number | string): Promise<User | null> {
    const numericId = typeof id === 'string' ? Number(id) : id;
    return this.repository.findOne({ where: { id: numericId } });
  }

  async create(user: Partial<User>): Promise<User> {
    const newUser = this.repository.create(user);
    return this.repository.save(newUser);
  }

  async update(id: number, updates: Partial<User>): Promise<User> {
    await this.repository.update(id, updates);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error('User not found after update');
    }
    return updated;
  }
}
