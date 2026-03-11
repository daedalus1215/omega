import * as path from 'path';
import { DataSource } from 'typeorm';

const databasePath =
  process.env.DATABASE ?? path.join(process.cwd(), 'db.sqlite');

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: databasePath,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: ['src/typeorm/migrations/*.ts'],
  synchronize: false,
  logging: true,
});

export default AppDataSource;
