import 'reflect-metadata';
import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const conn = await createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('=== Schools 596, 597, 598 ===');
    const [schools] = await conn.query(
      `SELECT s.id, s.name, s.owner_id, o.email AS current_owner_email, o.name AS current_owner_name
       FROM driving_schools s
       LEFT JOIN driving_school_owners o ON o.id = s.owner_id
       WHERE s.id IN (596, 597, 598)`
    );
    console.table(schools);

    console.log('\n=== Target owner atlantiskosovali@gmail.com ===');
    const [target] = await conn.query(
      `SELECT id, name, email, phone, is_active FROM driving_school_owners WHERE email = ?`,
      ['atlantiskosovali@gmail.com']
    );
    console.table(target);

    console.log('\n=== Owners involved (atlantis*) ===');
    const [owners] = await conn.query(
      `SELECT id, name, email, phone, is_active FROM driving_school_owners WHERE email LIKE 'atlantis%'`
    );
    console.table(owners);

    console.log('\n=== All schools owned by any atlantis* owner ===');
    const [allSchools] = await conn.query(
      `SELECT s.id, s.name, s.owner_id, o.email
       FROM driving_schools s
       JOIN driving_school_owners o ON o.id = s.owner_id
       WHERE o.email LIKE 'atlantis%'
       ORDER BY o.email, s.id`
    );
    console.table(allSchools);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
