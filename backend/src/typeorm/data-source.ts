import * as path from 'path';
import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(__dirname, '../../db.sqlite'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: ['src/typeorm/migrations/*.ts'],
  synchronize: false,
  logging: true,
});

export default AppDataSource;
