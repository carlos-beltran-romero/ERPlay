/**
 * Módulo de middleware de carga de archivos
 * Proporciona configuración y validación para la subida de imágenes de diagramas ER
 * @module middlewares/upload
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

/**
 * Directorio donde se almacenarán las imágenes de diagramas subidas
 * Se crea automáticamente si no existe
 */
const UPLOAD_DIR = path.resolve('uploads/diagrams');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Configuración de almacenamiento en disco para multer
 * Define el destino y el nombre de archivo para las imágenes subidas
 */
const storage = multer.diskStorage({
  /**
   * Determina el directorio de destino para el archivo
   * @param _req Objeto Request (no utilizado)
   * @param _file Archivo siendo procesado (no utilizado)
   * @param cb Callback para especificar el destino
   */
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),

  /**
   * Genera un nombre único para el archivo usando UUID
   * Preserva la extensión original del archivo (.jpg, .png)
   * @param _req Objeto Request (no utilizado)
   * @param file Archivo siendo procesado con metadata original
   * @param cb Callback para especificar el nombre final
   */
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

/**
 * Función de filtrado de archivos
 * Valida que solo se acepten imágenes JPEG y PNG
 * @param _req Objeto Request (no utilizado)
 * @param file Archivo siendo validado con información de tipo MIME
 * @param cb Callback para aceptar o rechazar el archivo
 * @throws {Error} Si el formato del archivo no es JPG o PNG
 */
function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ok = ['image/jpeg', 'image/png'].includes(file.mimetype);
  if (!ok) {
    return cb(new Error('Formato no permitido (solo JPG o PNG)'));
  }
  cb(null, true);
}

/**
 * Middleware configurado de multer para la carga de imágenes de diagramas
 * Configuración:
 * - Almacenamiento: Disco local en uploads/diagrams/
 * - Formatos permitidos: JPEG y PNG únicamente
 * - Tamaño máximo: 5 MB por archivo
 * - Campo esperado: 'image' (single file)
 * 
 * @remarks
 * Los archivos se renombran automáticamente con UUID para evitar colisiones.
 * El middleware rechaza cualquier archivo que no sea imagen JPEG o PNG.
 * Si el archivo excede 5MB, multer lanza un error automáticamente.
 * 
 * @example
 * // Uso en rutas de Express
 * router.post('/diagrams', uploadDiagramImage, createDiagram);
 * 
 * @example
 * // Acceso al archivo en el controlador
 * const uploadedFile = req.file;
 * const filePath = uploadedFile?.path;
 * const fileName = uploadedFile?.filename;
 * 
 * @example
 * // Request desde el cliente (multipart/form-data)
 * const formData = new FormData();
 * formData.append('image', fileBlob, 'diagram.png');
 * formData.append('title', 'Mi Diagrama ER');
 * 
 * @see {@link https://github.com/expressjs/multer|Multer Documentation}
 * @public
 */
export const uploadDiagramImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('image');