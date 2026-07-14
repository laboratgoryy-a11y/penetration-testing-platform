@echo off
echo ========================================
echo اختبار سريع لنظام الثغرات
echo ========================================
echo.

echo 1. التحقق من قاعدة البيانات...
sqlite3 penetration_testing.db "SELECT COUNT(*) as total_scans FROM scan_sessions;"
echo.

echo 2. آخر فحص...
sqlite3 penetration_testing.db "SELECT id, target_url, status, total_requests, total_vulnerabilities FROM scan_sessions ORDER BY created_at DESC LIMIT 1;"
echo.

echo 3. الثغرات للفحص الأخير...
sqlite3 penetration_testing.db "SELECT COUNT(*) as total_vulns FROM vulnerabilities WHERE scan_session_id = (SELECT id FROM scan_sessions ORDER BY created_at DESC LIMIT 1);"
echo.

echo 4. عرض أول 3 ثغرات...
sqlite3 penetration_testing.db "SELECT type, severity, location FROM vulnerabilities WHERE scan_session_id = (SELECT id FROM scan_sessions ORDER BY created_at DESC LIMIT 1) LIMIT 3;"
echo.

echo ========================================
echo الآن افتح المتصفح على:
echo http://localhost:3001/debug-scan-flow.html
echo ========================================
pause
