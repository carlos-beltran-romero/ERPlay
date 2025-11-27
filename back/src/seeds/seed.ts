import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../data-source';

/** Quita comentarios respetando comillas/backticks */
function stripSqlComments(sql: string): string {
  let out = '';
  let inSingle = false, inDouble = false, inBack = false;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    // toggles de comillas/backticks
    if (!inDouble && !inBack && ch === "'") {
      if (inSingle && next === "'") { out += "''"; i += 2; continue; }
      if (sql[i - 1] !== '\\') inSingle = !inSingle;
      out += ch; i++; continue;
    }
    if (!inSingle && !inBack && ch === '"') {
      if (inDouble && next === '"') { out += '""'; i += 2; continue; }
      if (sql[i - 1] !== '\\') inDouble = !inDouble;
      out += ch; i++; continue;
    }
    if (!inSingle && !inDouble && ch === '`') {
      if (inBack && next === '`') { out += '``'; i += 2; continue; }
      inBack = !inBack;
      out += ch; i++; continue;
    }

    // comentarios si no estamos dentro de cadena/backtick
    if (!inSingle && !inDouble && !inBack) {
      // -- comentario
      if (ch === '-' && next === '-') {
        const after2 = sql[i + 2] ?? '';
        if (/\s/.test(after2)) {
          // saltar hasta el salto de línea
          i += 2;
          while (i < sql.length && sql[i] !== '\n') i++;
          continue;
        }
      }

      // # comentario
      if (ch === '#') {
        while (i < sql.length && sql[i] !== '\n') i++;
        continue;
      }

      // /* comentario */
      if (ch === '/' && next === '*') {
        i += 2;
        while (i < sql.length - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
        if (i < sql.length) i += 2; // saltar también el '*/'
        continue;
      }
    }

    out += ch;
    i++;
  }

  return out;
}

/** Sustituye fechas/datetimes cero por valores válidos */
function normalizeZeroDates(sql: string): string {
  // '0000-00-00 00:00:00.000000' -> '1970-01-01 00:00:00'
  // '0000-00-00 00:00:00'        -> '1970-01-01 00:00:00'
  // '0000-00-00'                 -> '1970-01-01'
  return sql.replaceAll(/'0000-00-00(?: 00:00:00(?:\.\d{1,6})?)?'/g, (m) => {
    return m.includes(' ') ? "'1970-01-01 00:00:00'" : "'1970-01-01'";
  });
}

/** Divide en sentencias por ';' respetando comillas/backticks */
function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inSingle = false, inDouble = false, inBack = false;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const prev = sql[i - 1];
    const next = sql[i + 1];

    if (!inDouble && !inBack && ch === "'") {
      if (inSingle && next === "'") { buf += "''"; i += 2; continue; }
      if (prev !== '\\') inSingle = !inSingle;
      buf += ch; i++; continue;
    }
    if (!inSingle && !inBack && ch === '"') {
      if (inDouble && next === '"') { buf += '""'; i += 2; continue; }
      if (prev !== '\\') inDouble = !inDouble;
      buf += ch; i++; continue;
    }
    if (!inSingle && !inDouble && ch === '`') {
      if (inBack && next === '`') { buf += '``'; i += 2; continue; }
      inBack = !inBack;
      buf += ch; i++; continue;
    }

    if (ch === ';' && !inSingle && !inDouble && !inBack) {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = '';
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

function extractInsertStatements(sql: string): string[] {
  return splitSqlStatements(sql).filter(s => /^\s*INSERT\s+INTO/i.test(s));
}

function getTablesFromInsertStatements(stmts: string[]): string[] {
  const set = new Set<string>();
  for (const s of stmts) {
    const m = s.match(/INSERT\s+INTO\s+([^\s(]+)/i);
    if (m && m[1]) {
      const raw = m[1].split('.').pop();
      if (!raw) continue; // seguridad extra
      const table = raw.replaceAll('`', '');
      if (table) set.add(table);
    }
  }
  return Array.from(set);
}

async function run() {
  const dataSource = await AppDataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  const sqlPath = path.resolve(__dirname, '../../erplay.sql');
  const rawSql = fs.readFileSync(sqlPath, 'utf8');

  // 1) limpiar comentarios  2) normalizar fechas cero
  const sanitized = normalizeZeroDates(stripSqlComments(rawSql));
  const insertStatements = extractInsertStatements(sanitized);
  const tables = getTablesFromInsertStatements(insertStatements);

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
      try {
        await queryRunner.query(statement);
      } catch (e) {
        const preview = statement.length > 1200 ? statement.slice(0, 1200) + ' …' : statement;
        console.error('\n⚠️  Falló esta sentencia SQL:\n', preview, '\n');
        throw e;
      }
    }

    await queryRunner.commitTransaction();
    console.log('✅ Semilla ejecutada correctamente.');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Error ejecutando la semilla:', error);
    process.exitCode = 1;
  } finally {
    if (foreignKeysDisabled) {
      try { await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
    }
    await queryRunner.release();
    await dataSource.destroy();
  }
}

run().catch((e) => {
  console.error('❌ Error inesperado en el seed:', e);
  process.exit(1);
});
