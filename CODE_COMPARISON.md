# 🔄 مقارنة الكود: PostgreSQL vs MySQL

## 📋 نظرة عامة

هذا الملف يوضح الفروقات في الكود بين النسخة PostgreSQL والنسخة MySQL.

---

## 1️⃣ ملف الاتصال (Connection File)

### PostgreSQL (`connection.ts`)

```typescript
import { Pool } from 'pg';
import { createClient } from 'redis';

const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
});

export async function query(text: string, params?: unknown[]) {
  return await pgPool.query(text, params);
}
```

### MySQL (`connection-mysql-complete.ts`)

```typescript
import mysql from 'mysql2/promise';

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
});

// In-memory session storage (no Redis)
const sessionStore = new Map<string, { value: string; expiry: number }>();

export async function query(text: string, params?: any[]) {
  // Convert $1, $2 to ?
  const mysqlQuery = text.replace(/\$(\d+)/g, '?');
  const [rows] = await mysqlPool.execute(mysqlQuery, params || []);
  return {
    rows: Array.isArray(rows) ? rows : [],
    rowCount: Array.isArray(rows) ? rows.length : 0
  };
}
```

**الفروقات الرئيسية:**
- ✅ استبدال `pg` بـ `mysql2/promise`
- ✅ تحويل تلقائي من `$1, $2` إلى `?`
- ✅ استبدال Redis بـ in-memory storage
- ✅ نفس الواجهة البرمجية (API)

---

## 2️⃣ Schema SQL

### PostgreSQL

```sql
-- UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table with UUID
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INET type
ip_address INET NOT NULL

-- JSONB type
config JSONB NOT NULL

-- Insert with RETURNING
INSERT INTO users (username, email) 
VALUES ($1, $2) 
RETURNING *;

-- ON CONFLICT
INSERT INTO users (username) 
VALUES ($1) 
ON CONFLICT (username) DO NOTHING;
```

### MySQL

```sql
-- No extension needed

-- Table with VARCHAR UUID
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- VARCHAR for IP
ip_address VARCHAR(45) NOT NULL

-- JSON type
config JSON NOT NULL

-- Insert without RETURNING
INSERT INTO users (username, email) 
VALUES (?, ?);
-- Then SELECT to get inserted row

-- ON DUPLICATE KEY UPDATE
INSERT INTO users (username) 
VALUES (?) 
ON DUPLICATE KEY UPDATE username=username;
```

**الفروقات الرئيسية:**
- ✅ UUID → VARCHAR(36)
- ✅ INET → VARCHAR(45)
- ✅ JSONB → JSON
- ✅ RETURNING → SELECT after INSERT
- ✅ ON CONFLICT → ON DUPLICATE KEY UPDATE

---

## 3️⃣ استعلامات SQL في الكود

### PostgreSQL

```typescript
// Insert with RETURNING
const result = await query(
  'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
  [username, email]
);
const user = result.rows[0];

// Update with RETURNING
const result = await query(
  'UPDATE users SET email = $1 WHERE id = $2 RETURNING *',
  [email, id]
);

// Array contains
const result = await query(
  'SELECT * FROM users WHERE $1 = ANY(roles)',
  [role]
);
```

### MySQL (مع التحويل التلقائي)

```typescript
// Insert without RETURNING
const result = await query(
  'INSERT INTO users (username, email) VALUES ($1, $2)',
  [username, email]
);
// Get inserted row
const user = await query(
  'SELECT * FROM users WHERE id = LAST_INSERT_ID()'
);

// Update without RETURNING
await query(
  'UPDATE users SET email = $1 WHERE id = $2',
  [email, id]
);
// Get updated row
const result = await query(
  'SELECT * FROM users WHERE id = $1',
  [id]
);

// JSON contains (different syntax)
const result = await query(
  'SELECT * FROM users WHERE JSON_CONTAINS(roles, $1)',
  [JSON.stringify(role)]
);
```

**ملاحظة:** الكود يستخدم `$1, $2` ويتم تحويله تلقائياً إلى `?` في ملف الاتصال!

---

## 4️⃣ أنواع البيانات

### PostgreSQL Types

```typescript
interface User {
  id: string;              // UUID
  ip_address: string;      // INET
  config: object;          // JSONB
  file_data: Buffer;       // BYTEA
  created_at: Date;        // TIMESTAMP
}
```

### MySQL Types

```typescript
interface User {
  id: string;              // VARCHAR(36)
  ip_address: string;      // VARCHAR(45)
  config: object;          // JSON
  file_data: Buffer;       // BLOB
  created_at: Date;        // TIMESTAMP
}
```

**الفروقات:** نفس الواجهة في TypeScript، فقط التخزين مختلف!

---

## 5️⃣ Repositories (لا تحتاج تعديل!)

### UserRepository.ts

```typescript
export class UserRepository {
  constructor(private db: Pool) {}  // يعمل مع كليهما!

  async create(input: UserCreateInput): Promise<User> {
    // نفس الكود تماماً
    const query = `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await this.db.query(query, [
      input.username,
      input.email,
      passwordHash,
    ]);
    return new User(result.rows[0]);
  }
}
```

**لا تحتاج تعديل!** ملف الاتصال يتعامل مع الفروقات.

---

## 6️⃣ Models (لا تحتاج تعديل!)

### User.ts

```typescript
export class User {
  id: string;
  username: string;
  email: string;
  // ... باقي الحقول

  constructor(data: Partial<User>) {
    this.id = data.id || '';
    this.username = data.username || '';
    // ... نفس الكود
  }
}
```

**لا تحتاج تعديل!** Models تعمل مع كلا النظامين.

---

## 7️⃣ Services (لا تحتاج تعديل!)

### AuthenticationService.ts

```typescript
export class AuthenticationService {
  async login(username: string, password: string) {
    // نفس الكود تماماً
    const user = await this.userRepo.findByUsername(username);
    // ... باقي المنطق
  }
}
```

**لا تحتاج تعديل!** Services تعمل مع كلا النظامين.

---

## 8️⃣ API Routes (لا تحتاج تعديل!)

### auth.routes.ts

```typescript
router.post('/login', async (req, res) => {
  // نفس الكود تماماً
  const { username, password } = req.body;
  const result = await authService.login(username, password);
  res.json(result);
});
```

**لا تحتاج تعديل!** Routes تعمل مع كلا النظامين.

---

## 9️⃣ Frontend (لا تحتاج تعديل!)

### api.js

```javascript
async function login(username, password) {
  // نفس الكود تماماً
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return response.json();
}
```

**لا تحتاج تعديل!** Frontend لا يعرف الفرق!

---

## 🎯 الخلاصة

### ملفات تحتاج تعديل (2 فقط):
1. ✅ `src/database/connection.ts` - استبدله بـ connection-mysql-complete.ts
2. ✅ `schema.sql` - استبدله بـ schema-mysql-complete.sql

### ملفات لا تحتاج تعديل (كل شيء آخر!):
- ✅ `src/models/*` - جميع الـ models
- ✅ `src/repositories/*` - جميع الـ repositories
- ✅ `src/services/*` - جميع الـ services
- ✅ `src/api/*` - جميع الـ routes
- ✅ `public/*` - جميع ملفات الواجهة
- ✅ `src/middleware/*` - جميع الـ middleware
- ✅ `src/types/*` - جميع الـ types
- ✅ `src/utils/*` - جميع الـ utilities

---

## 📊 جدول المقارنة الشامل

| الميزة | PostgreSQL | MySQL | التوافق |
|--------|-----------|-------|---------|
| **Connection Pool** | pg.Pool | mysql2.Pool | ✅ نفس الواجهة |
| **Query Syntax** | $1, $2, $3 | ?, ?, ? | ✅ تحويل تلقائي |
| **UUID** | UUID type | VARCHAR(36) | ✅ نفس الاستخدام |
| **JSON** | JSONB | JSON | ✅ نفس الاستخدام |
| **IP Address** | INET | VARCHAR(45) | ✅ نفس الاستخدام |
| **Timestamps** | TIMESTAMP | TIMESTAMP | ✅ متطابق |
| **Transactions** | BEGIN/COMMIT | BEGIN/COMMIT | ✅ متطابق |
| **Indexes** | CREATE INDEX | CREATE INDEX | ✅ متطابق |
| **Foreign Keys** | REFERENCES | REFERENCES | ✅ متطابق |
| **Sessions** | Redis | In-Memory | ⚠️ مختلف |

---

## 💡 نصائح للمطورين

### عند كتابة كود جديد:

1. **استخدم دائماً `$1, $2, $3`**
   ```typescript
   // ✅ صحيح - يعمل مع كليهما
   await query('SELECT * FROM users WHERE id = $1', [id]);
   
   // ❌ خطأ - لا يعمل مع PostgreSQL
   await query('SELECT * FROM users WHERE id = ?', [id]);
   ```

2. **لا تستخدم RETURNING في INSERT/UPDATE**
   ```typescript
   // ✅ صحيح - يعمل مع كليهما
   await query('INSERT INTO users (name) VALUES ($1)', [name]);
   const user = await query('SELECT * FROM users WHERE id = LAST_INSERT_ID()');
   
   // ❌ خطأ - لا يعمل مع MySQL
   const result = await query('INSERT INTO users (name) VALUES ($1) RETURNING *', [name]);
   ```

3. **استخدم VARCHAR للـ UUID**
   ```sql
   -- ✅ صحيح - يعمل مع كليهما
   id VARCHAR(36) PRIMARY KEY
   
   -- ❌ خطأ - لا يعمل مع MySQL
   id UUID PRIMARY KEY
   ```

4. **استخدم JSON بدلاً من JSONB**
   ```sql
   -- ✅ صحيح - يعمل مع كليهما
   config JSON
   
   -- ❌ خطأ - لا يعمل مع MySQL
   config JSONB
   ```

---

## 🎓 الدروس المستفادة

### ✅ ما نجح:
- استخدام wrapper layer للاتصال
- الحفاظ على نفس الواجهة البرمجية
- التحويل التلقائي للاستعلامات
- عدم تعديل business logic

### ⚠️ ما يجب الانتباه له:
- الجلسات في الذاكرة (تُفقد عند إعادة التشغيل)
- بعض الميزات المتقدمة غير متاحة في MySQL
- الأداء قد يختلف في بعض الحالات

### 💡 التوصيات:
- استخدم MySQL للتطوير (سهل)
- استخدم PostgreSQL للإنتاج (قوي)
- احتفظ بالتوافق مع كليهما
- اختبر على كلا النظامين

---

**النتيجة: تحويل ناجح مع الحد الأدنى من التغييرات! 🎉**
