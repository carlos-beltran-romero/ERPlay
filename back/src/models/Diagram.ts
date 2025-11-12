/**
 * Módulo del modelo de diagramas ER
 * Define la entidad Diagram que representa diagramas Entidad-Relación subidos al sistema
 * @module models/Diagram
 */

import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, BaseEntity,
} from 'typeorm';
import { User } from './User';
import { Question } from './Question';

/**
 * Entidad Diagram - Diagrama Entidad-Relación del sistema
 * Representa una imagen de diagrama ER subida por un supervisor o administrador
 * que sirve como base para la generación y asociación de preguntas de test.
 *
 * @remarks
 * - Tabla en BD: `diagrams`.
 * - Cada diagrama puede tener múltiples preguntas asociadas.
 * - Se almacenan como archivos de imagen en el sistema de archivos.
 * - El título debe ser único para facilitar búsqueda y referencia.
 * - Las preguntas se eliminan en cascada si se elimina el diagrama.
 */
@Entity({ name: 'diagrams' })
export class Diagram extends BaseEntity {
  /**
   * Identificador único del diagrama
   * Generado automáticamente como UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Título descriptivo del diagrama
   * Debe ser único en el sistema para evitar duplicados
   * Utilizado en la interfaz de usuario para identificar el diagrama
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  title!: string;

  /**
   * Nombre del archivo original subido
   * Preserva el nombre con el que se subió el archivo
   * @example "diagrama_biblioteca.png"
   */
  @Column({ type: 'varchar', length: 255 })
  filename!: string;

  /**
   * Ruta relativa del archivo en el sistema de archivos
   * Utilizada para servir la imagen a través de la API
   * @example "/uploads/diagrams/abc123-def456.png"
   */
  @Column({ type: 'varchar', length: 500 })
  path!: string;

  /**
   * Preguntas asociadas a este diagrama
   * Relación uno-a-muchos con eliminación en cascada
   * Si se elimina el diagrama, todas sus preguntas se eliminan
   */
  @OneToMany(() => Question, (question) => question.diagram, { cascade: true })
  questions!: Question[];

  /**
   * Fecha y hora de creación del diagrama
   * Generada automáticamente al insertar el registro
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /**
   * Fecha y hora de última actualización
   * Actualizada automáticamente en cada modificación del registro
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}