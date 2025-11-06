// src/index.ts
/**
 * @module index
 */
import { AppDataSource } from './data-source';
import { env } from './config/env';

const PORT = env.PORT ?? 3000;

AppDataSource.initialize()
  .then(async () => {
    console.log('✅ Conexión a MySQL establecida (TypeORM).');
    try {
      const executed = await AppDataSource.runMigrations();
      if (executed.length > 0) {
        console.log(`📦 ${executed.length} migraciones aplicadas.`);
      } else {
        console.log('📦 Sin migraciones pendientes.');
      }
    } catch (migrationError) {
      console.error('❌ Error ejecutando migraciones:', migrationError);
      process.exit(1);
    }
    const { default: app } = await import('./server');
    app.listen(PORT, () => {
      console.log(`🚀 API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error inicializando DataSource:', err);
    process.exit(1);
  });
