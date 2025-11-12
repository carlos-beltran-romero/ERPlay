import 'reflect-metadata';
import fs from 'fs';
import path from 'path';

import { AppDataSource } from '../data-source';

async function run() {
  const dataSource = await AppDataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  const sqlPath = path.resolve(__dirname, '../../erplay.sql');
  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  const sanitized = rawSql
    .replace(/\/\*![\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');

  const insertStatements = sanitized.match(/INSERT INTO[\s\S]+?;/gi) ?? [];
  const tables = Array.from(
    new Set(
      insertStatements
        .map(statement => {
          const match = statement.match(/INSERT INTO\s+`?([\w-]+)`?/i);
          return match ? match[1] : undefined;
        })
        .filter((table): table is string => Boolean(table))
    )
  );

  if (!insertStatements.length) {
    console.warn('No se encontraron sentencias INSERT en el fichero SQL.');
    await dataSource.destroy();
    return;
  }

  console.log(`Encontradas ${insertStatements.length} sentencias INSERT en ${tables.length} tablas.`);

  await queryRunner.connect();
  await queryRunner.startTransaction();

  let foreignKeysDisabled = false;

  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    foreignKeysDisabled = true;

    for (const table of tables) {
      await queryRunner.query(`DELETE FROM \`${table}\``);
    }

    for (const statement of insertStatements) {
      await queryRunner.query(statement);
    }

    await queryRunner.commitTransaction();
    console.log('✅ Semilla ejecutada correctamente.');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error ejecutando la semilla:', error);
    process.exitCode = 1;
  } finally {
    if (foreignKeysDisabled) {
      try {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      } catch {
      }
    }
    await queryRunner.release();
    await dataSource.destroy();
  }
}

run();
