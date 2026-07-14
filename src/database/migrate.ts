import bcrypt from 'bcrypt';
import { readFileSync } from 'fs';
import { join } from 'path';
import { closeConnections, query } from './connection';

async function bootstrapAdminUser(): Promise<void> {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!username || !email || !password) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE
       SET email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           updated_at = NOW()`,
    [username, email, passwordHash]
  );

  await query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT u.id, r.id
     FROM users u
     CROSS JOIN roles r
     WHERE LOWER(u.username) = LOWER($1)
       AND r.name = 'ADMIN'
     ON CONFLICT DO NOTHING`,
    [username]
  );
}

async function runMigration(): Promise<void> {
  try {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    const statements = schema
      .split(/;\s*$/m)
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      await query(statement);
    }

    await bootstrapAdminUser();
  } finally {
    await closeConnections();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed', error);
      process.exit(1);
    });
}

export { runMigration };
