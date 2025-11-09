// src/index.ts
import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { env } from './config/env';

const PORT = Number(env.PORT ?? 3000);

AppDataSource.initialize()
  .then(async () => {
    console.log('✅ Conexión a MySQL establecida (TypeORM).');
    try {
      const executed = await AppDataSource.runMigrations();
      console.log(executed.length ? `📦 ${executed.length} migraciones aplicadas.` : '📦 Sin migraciones pendientes.');
    } catch (e) {
      console.error('❌ Error ejecutando migraciones:', e);
      process.exit(1);
    }

    const { default: app } = await import('./server');
    app.listen(PORT, () => console.log(`🚀 API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Error inicializando DataSource:', err);
    process.exit(1);
  });
