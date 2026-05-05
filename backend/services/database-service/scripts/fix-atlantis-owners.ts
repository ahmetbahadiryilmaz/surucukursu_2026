import 'reflect-metadata';
import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../../.env') });

const TARGET_OWNER_ID = 598;
const SCHOOLS_TO_REPOINT = [596, 597];
const OWNERS_TO_DELETE = [596, 597];

async function main() {
  const conn = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await conn.beginTransaction();

    const [verifyTarget] = await conn.query(
      `SELECT id, email FROM driving_school_owners WHERE id = ? AND email = ?`,
      [TARGET_OWNER_ID, 'atlantiskosovali@gmail.com']
    );
    if ((verifyTarget as any[]).length !== 1) {
      throw new Error(`Target owner id=${TARGET_OWNER_ID} not found or email mismatch`);
    }

    const [updateRes]: any = await conn.query(
      `UPDATE driving_schools SET owner_id = ? WHERE id IN (?, ?)`,
      [TARGET_OWNER_ID, ...SCHOOLS_TO_REPOINT]
    );
    console.log(`UPDATE driving_schools → affected rows: ${updateRes.affectedRows}, changed: ${updateRes.changedRows}`);

    const [deleteRes]: any = await conn.query(
      `DELETE FROM driving_school_owners WHERE id IN (?, ?)`,
      OWNERS_TO_DELETE
    );
    console.log(`DELETE driving_school_owners → affected rows: ${deleteRes.affectedRows}`);

    await conn.commit();
    console.log('Committed.');

    console.log('\n=== Post-state ===');
    const [after] = await conn.query(
      `SELECT s.id, s.name, s.owner_id, o.email
       FROM driving_schools s
       LEFT JOIN driving_school_owners o ON o.id = s.owner_id
       WHERE s.id IN (596, 597, 598)`
    );
    console.table(after);

    const [remaining] = await conn.query(
      `SELECT id, name, email FROM driving_school_owners WHERE email LIKE 'atlantis%'`
    );
    console.table(remaining);
  } catch (e) {
    await conn.rollback();
    console.error('Rolled back due to error:', e);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
