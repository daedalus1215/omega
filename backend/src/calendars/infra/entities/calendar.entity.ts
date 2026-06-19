import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Infrastructure entity for Calendar.
 * TypeORM entity for database persistence.
 */
@Entity({ name: 'calendars' })
@Index(['ownerId'])
export class CalendarEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 60 })
  name: string;

  @Column({ name: 'color', type: 'varchar', length: 20, nullable: true })
  color?: string;

  @Column({ name: 'owner_id', type: 'int' })
  ownerId: number;

  @Column({ name: 'is_personal', type: 'boolean', default: false })
  isPersonal: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
