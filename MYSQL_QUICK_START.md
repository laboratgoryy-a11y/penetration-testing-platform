# 🚀 Quick Start Guide - MySQL Version

## ✅ Prerequisites

1. **XAMPP** installed with MySQL running
2. **Node.js** installed (v14 or higher)
3. **npm** packages installed

## 📋 Step-by-Step Setup

### Step 1: Start MySQL in XAMPP

1. Open XAMPP Control Panel
2. Click "Start" next to MySQL
3. Verify MySQL is running on port 3306

### Step 2: Create Database

Open phpMyAdmin (http://localhost/phpmyadmin) and run:

```sql
CREATE DATABASE IF NOT EXISTS web_scanner 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or use MySQL command line:

```bash
mysql -u root -p
CREATE DATABASE web_scanner;
exit;
```

### Step 3: Import Database Schema

In phpMyAdmin:
1. Select `web_scanner` database
2. Click "Import" tab
3. Choose file: `src/database/schema.sql`
4. Click "Go"

Or use command line:

```bash
mysql -u root web_scanner < src/database/schema.sql
```

### Step 4: Verify Configuration

Check `.env` file contains:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=web_scanner
DB_USER=root
DB_PASSWORD=
```

### Step 5: Start the Server

**Option A: Using Batch File (Recommended)**
```bash
start-mysql-server.bat
```

**Option B: Using Node directly**
```bash
node server-mysql.js
```

### Step 6: Access the Application

Open your browser and go to:
- **Login Page**: http://localhost:3001/login.html
- **Dashboard**: http://localhost:3001/index.html

## 🔐 Login Credentials

For demo purposes, any username/password will work:
- Username: `admin` (or any username)
- Password: `password` (or any password)

## ✨ Available Features

After login, you can access:

1. **📊 Dashboard** - Overview of all activities
2. **🔍 Web Scanner** - Scan websites for vulnerabilities
3. **🌐 Network Analysis** - Analyze network security
4. **🎣 Phishing Campaigns** - Create and manage phishing tests
5. **📄 Reports** - Generate security reports
6. **🔑 Authorizations** - Manage testing authorizations

## 🔧 Troubleshooting

### Error: "Cannot connect to MySQL"

**Solution:**
1. Make sure XAMPP MySQL is running
2. Check port 3306 is not blocked
3. Verify database name is `web_scanner`
4. Check `.env` file settings

### Error: "Database does not exist"

**Solution:**
```sql
CREATE DATABASE web_scanner;
```

### Error: "Table doesn't exist"

**Solution:**
Import the schema file:
```bash
mysql -u root web_scanner < src/database/schema.sql
```

### Error: "Port 3001 already in use"

**Solution:**
1. Close any other Node.js processes
2. Or change PORT in `.env` file:
```env
PORT=3002
```

## 📝 Database Tables Created

The schema creates 17 tables:
- `users` - User accounts
- `sessions` - User sessions
- `roles` - User roles
- `permissions` - System permissions
- `authorizations` - Testing authorizations
- `scan_sessions` - Web scan sessions
- `vulnerabilities` - Discovered vulnerabilities
- `phishing_campaigns` - Phishing test campaigns
- `campaign_targets` - Campaign recipients
- `campaign_interactions` - User interactions
- `network_test_sessions` - Network test sessions
- `network_vulnerabilities` - Network vulnerabilities
- `discovered_devices` - Discovered network devices
- `audit_logs` - System audit logs
- `reports` - Generated reports
- And more...

## 🎯 Next Steps

1. ✅ Login to the system
2. ✅ Create an authorization
3. ✅ Run your first web scan
4. ✅ Analyze network security
5. ✅ Generate reports

## 📞 Need Help?

If you encounter any issues:
1. Check the server console for error messages
2. Verify MySQL is running in XAMPP
3. Check database connection settings in `.env`
4. Make sure all npm packages are installed: `npm install`

---

**System Status:**
- ✅ Database: MySQL (XAMPP)
- ✅ Database Name: web_scanner
- ✅ Server Port: 3001
- ✅ All Features: Enabled
