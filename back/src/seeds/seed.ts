import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../data-source';

/** Quita comentarios respetando comillas/backticks */
function stripSqlComments(sql: string): string {
  let out = '';
  let inSingle = false, inDouble = false, inBack = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i], next = sql[i + 1];

    // toggles de comillas/backticks
    if (!inDouble && !inBack && ch === "'") {
      if (inSingle && next === "'") { out += "''"; i++; continue; }
      if (sql[i - 1] !== '\\') inSingle = !inSingle;
      out += ch; continue;
    }
    if (!inSingle && !inBack && ch === '"') {
      if (inDouble && next === '"') { out += '""'; i++; continue; }
      if (sql[i - 1] !== '\\') inDouble = !inDouble;
      out += ch; continue;
    }
    if (!inSingle && !inDouble && ch === '`') {
      if (inBack && next === '`') { out += '``'; i++; continue; }
      inBack = !inBack;
      out += ch; continue;
    }

    // comentarios si no estamos dentro de cadena/backtick
    if (!inSingle && !inDouble && !inBack) {
      if (ch === '-' && next === '-') {
        const after2 = sql[i + 2] ?? '';
        if (/\s/.test(after2)) { while (i < sql.length && sql[i] !== '\n') i++; continue; }
      }
      if (ch === '#') { while (i < sql.length && sql[i] !== '\n') i++; continue; }
      if (ch === '/' && next === '*') {
        i += 2;
        while (i < sql.length - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
        i++; // situarnos en '/'
        continue;
      }
    }

    out += ch;
  }
  return out;
}

/** Sustituye fechas/datetimes cero por valores válidos */
function normalizeZeroDates(sql: string): string {
  // '0000-00-00 00:00:00.000000' -> '1970-01-01 00:00:00'
  // '0000-00-00 00:00:00'        -> '1970-01-01 00:00:00'
  // '0000-00-00'                 -> '1970-01-01'
  return sql.replace(/'0000-00-00(?: 00:00:00(?:\.\d{1,6})?)?'/g, (m) => {
    return m.includes(' ') ? "'1970-01-01 00:00:00'" : "'1970-01-01'";
  });
}

/** Divide en sentencias por ';' respetando comillas/backticks */
function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inSingle = false, inDouble = false, inBack = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i], prev = sql[i - 1], next = sql[i + 1];

    if (!inDouble && !inBack && ch === "'") {
      if (inSingle && next === "'") { buf += "''"; i++; continue; }
      if (prev !== '\\') inSingle = !inSingle;
      buf += ch; continue;
    }
    if (!inSingle && !inBack && ch === '"') {
      if (inDouble && next === '"') { buf += '""'; i++; continue; }
      if (prev !== '\\') inDouble = !inDouble;
      buf += ch; continue;
    }
    if (!inSingle && !inDouble && ch === '`') {
      if (inBack && next === '`') { buf += '``'; i++; continue; }
      inBack = !inBack;
      buf += ch; continue;
    }

    if (ch === ';' && !inSingle && !inDouble && !inBack) {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = '';
      continue;
    }

    buf += ch;
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
      const table = m[1].split('.').pop()!.replace(/`/g, '');
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
