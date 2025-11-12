/**
 * @module back/middlewares/logger
 * Registro uniforme de peticiones HTTP.
 */
import morgan from 'morgan';

/**
 * Middleware de logging en formato Apache combinado.
 * @public
 */
const httpLogger = morgan('combined');

export default httpLogger;
