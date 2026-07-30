/**
 * Regenerates everything in `database/` from `backend/prisma/schema.prisma`.
 *
 *   database/sql/schema.sql        full CREATE script for a brand new database
 *   database/schema.md            human readable table + column reference
 *   database/prisma/schema.snapshot.prisma   verbatim copy of the live schema
 *
 * Run it after every schema change (or let the CI check enforce it):
 *   npm run db:sql --prefix backend
 *
 * The point is that nobody has to open the database, or Prisma Studio, to find
 * out what a table looks like.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';

const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = join(backendDir, 'prisma', 'schema.prisma');
const databaseDir = join(backendDir, '..', 'database');

// Output is deliberately deterministic - no timestamps. The CI job regenerates
// these files and fails if `git diff` is not empty, so a value that changes on
// its own would make every build fail the day after a schema change. Use
// `git log` on the files if you want to know when they last moved.
const HEADER = [
  '-- ---------------------------------------------------------------------------',
  '-- BIVRY SaaS - full PostgreSQL schema',
  '--',
  '-- GENERATED FILE. Do not edit by hand.',
  '-- Source of truth: backend/prisma/schema.prisma',
  '-- Regenerate with: npm run db:sql',
  '--',
  '-- This is the complete CREATE script for an empty database. Applying it by',
  '-- hand is only for inspection or for a disaster recovery restore. The normal',
  '-- path is `npx prisma migrate deploy`, which also records the migration in',
  '-- the _prisma_migrations table.',
  '-- ---------------------------------------------------------------------------',
  '',
].join('\n');

// ---------------------------------------------------------------------------
// 1. Full DDL
// ---------------------------------------------------------------------------

mkdirSync(join(databaseDir, 'sql'), { recursive: true });

// The Prisma CLI is invoked through node directly rather than through npx: on
// Windows, spawning a .cmd shim from execFileSync fails with EINVAL.
const prismaCli = fileURLToPath(import.meta.resolve('prisma/build/index.js'));

const ddl = execFileSync(
  process.execPath,
  [prismaCli, 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', schemaPath, '--script'],
  { cwd: backendDir, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);

writeFileSync(join(databaseDir, 'sql', 'schema.sql'), HEADER + ddl, 'utf8');

// ---------------------------------------------------------------------------
// 2. Verbatim schema copy
// ---------------------------------------------------------------------------

mkdirSync(join(databaseDir, 'prisma'), { recursive: true });
copyFileSync(schemaPath, join(databaseDir, 'prisma', 'schema.snapshot.prisma'));

// ---------------------------------------------------------------------------
// 3. Markdown reference, built from the generated client's data model
// ---------------------------------------------------------------------------

const { models, enums } = Prisma.dmmf.datamodel;

/** Column name in PostgreSQL, which may differ from the Prisma field name. */
const column = (field) => field.dbName ?? field.name;

function sqlType(field) {
  if (field.kind === 'enum') {
    // Report the PostgreSQL type name, which is the @@map'd one.
    const enumType = enums.find((item) => item.name === field.type);
    return enumType?.dbName ?? field.type;
  }

  const native = field.nativeType?.[0];
  if (native) return native.toLowerCase();

  return (
    {
      String: 'text',
      Boolean: 'boolean',
      Int: 'integer',
      BigInt: 'bigint',
      Float: 'double precision',
      Decimal: 'numeric',
      DateTime: 'timestamp(3)',
      Json: 'jsonb',
      Bytes: 'bytea',
    }[field.type] ?? field.type.toLowerCase()
  );
}

function defaultValue(field) {
  const value = field.default;
  if (value === undefined) return '';
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return { uuid: 'uuid()', now: 'now()', cuid: 'cuid()', autoincrement: 'serial' }[value.name] ?? `${value.name}()`;
  }
  if (field.isUpdatedAt) return 'auto on update';
  return typeof value === 'string' ? `'${value}'` : String(value);
}

function notes(model, field) {
  const parts = [];
  if (field.isId) parts.push('primary key');
  if (field.isUnique) parts.push('unique');
  if (field.isUpdatedAt) parts.push('set on every update');

  const relation = model.fields.find(
    (other) => other.kind === 'object' && other.relationFromFields?.includes(field.name),
  );
  if (relation) {
    const target = models.find((m) => m.name === relation.type);
    parts.push(`FK to \`${target?.dbName ?? relation.type}\` (cascade delete)`);
  }

  if (field.documentation) parts.push(field.documentation.replace(/\s+/g, ' ').trim());
  return parts.join('; ');
}

function renderModel(model) {
  const table = model.dbName ?? model.name;
  const scalars = model.fields.filter((field) => field.kind !== 'object');

  const rows = scalars.map((field) => {
    const nullable = field.isRequired ? 'NOT NULL' : 'NULL';
    return `| \`${column(field)}\` | ${sqlType(field)} | ${nullable} | ${defaultValue(field)} | ${notes(model, field)} |`;
  });

  const indexes = (model.uniqueFields ?? []).map(
    (group) => `- unique: (${group.map((name) => `\`${name}\``).join(', ')})`,
  );

  const relations = model.fields
    .filter((field) => field.kind === 'object')
    .map((field) => {
      const target = models.find((m) => m.name === field.type);
      const arity = field.isList ? 'many' : field.isRequired ? 'one' : 'optional one';
      return `- ${arity} \`${target?.dbName ?? field.type}\``;
    });

  return [
    `### \`${table}\``,
    model.documentation ? `\n${model.documentation.replace(/\s+/g, ' ').trim()}` : '',
    '',
    '| Column | Type | Null | Default | Notes |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    indexes.length > 0 ? `\n**Constraints**\n\n${indexes.join('\n')}` : '',
    relations.length > 0 ? `\n**Relations**\n\n${relations.join('\n')}` : '',
    '',
  ].join('\n');
}

const markdown = [
  '# BIVRY SaaS - database reference',
  '',
  '> GENERATED FILE. Do not edit by hand.',
  '> Source of truth: `backend/prisma/schema.prisma`. Regenerate with `npm run db:sql`.',
  '',
  'This file exists so nobody has to open the database, or Prisma Studio, just to',
  'look up a column. Every table, column, type, default and relation is below.',
  '',
  `**${models.length} tables, ${enums.length} enum types.**`,
  '',
  '## Tables',
  '',
  models.map((model) => `- [\`${model.dbName ?? model.name}\`](#${(model.dbName ?? model.name).replace(/_/g, '')})`).join('\n'),
  '',
  '## Enum types',
  '',
  '| Type | Values |',
  '| --- | --- |',
  ...enums.map((item) => `| \`${item.dbName ?? item.name}\` | ${item.values.map((value) => `\`${value.name}\``).join(', ')} |`),
  '',
  '## Table detail',
  '',
  models.map(renderModel).join('\n'),
].join('\n');

writeFileSync(
  join(databaseDir, 'schema.md'),
  `${markdown.replace(/\n{3,}/g, '\n\n').trimEnd()}\n`,
  'utf8',
);

// ---------------------------------------------------------------------------

const lines = readFileSync(join(databaseDir, 'sql', 'schema.sql'), 'utf8').split('\n').length;
console.log(`database/sql/schema.sql                 ${lines} lines`);
console.log(`database/schema.md                      ${models.length} tables, ${enums.length} enums`);
console.log('database/prisma/schema.snapshot.prisma  copied');
