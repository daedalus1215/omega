import { DataSource } from 'typeorm';

/**
 * CLI data source — used by `npm run migration:generate` and `migration:run`.
 *
 * The APP does not read this file; app.module.ts builds its own connection and runs
 * migrations itself (`migrationsRun: true`). The two must describe the same database,
 * or a migration generated here would be written against a schema the app never has.
 */
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});

export default AppDataSource;
