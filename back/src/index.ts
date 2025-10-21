// src/index.ts
import './server';          
import 'dotenv/config';
import { AppDataSource } from './data-source';

const PORT = process.env.PORT || 3000;

AppDataSource.initialize()
  .then(() => {
    console.log('✅ Conexión a MySQL establecida (TypeORM).');
    import('./server').then(({ default: app }) => {
      app.listen(PORT, () =>
        console.log(`🚀 API listening on http://localhost:${PORT}`)
      );
    });
  })
  .catch((err) => {
    console.error('❌ Error inicializando DataSource:', err);
    process.exit(1);
  });
