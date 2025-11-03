import { AppDataSource } from './data-source';
import { env } from './config/env';

const port = env.PORT;

AppDataSource.initialize()
  .then(async () => {
    const { default: app } = await import('./server');
    app.listen(port, () => {
      console.log(`API disponible en http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('No se pudo iniciar la API', error);
    process.exit(1);
  });
