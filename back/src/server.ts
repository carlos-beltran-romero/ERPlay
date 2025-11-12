/**
 * @module back/server
 */
import { createApp } from './app';

/**
 * Instancia singleton de la aplicación.
 * @public
 */
const app = createApp();

export default app;
