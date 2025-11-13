import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { env } from './config/env';

const PORT = Number(env.PORT ?? 3000);

AppDataSource.initialize()
  .then(async () => {
    console.log('✅ Conexión a MySQL establecida (TypeORM).');
    const { default: app } = await import('./server');
    app.listen(PORT, () => console.log(`🚀 API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Error inicializando DataSource:', err);
    process.exit(1);
  });
