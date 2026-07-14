/**
 * اختبار Simple IP Scanner
 */

const SimpleIPScanner = require('./simple-ip-scanner.js');

async function testScanner() {
    console.log('='.repeat(60));
    console.log('اختبار Simple IP Scanner');
    console.log('='.repeat(60));
    console.log('');

    const scanner = new SimpleIPScanner();
    
    // اختبار 1: فحص localhost
    console.log('1️⃣ اختبار فحص localhost...');
    console.log('');
    
    try {
        const results = await scanner.scanHost('127.0.0.1', 'quick');
        
        console.log('✅ النتائج:');
        console.log(`   Success: ${results.success}`);
        console.log(`   Hosts up: ${results.stats?.hosts_up || 0}`);
        console.log(`   Open ports: ${results.stats?.open_ports || 0}`);
        console.log(`   Scan time: ${results.stats?.scan_time || 0}s`);
        console.log('');
        
        if (results.ports && results.ports.length > 0) {
            console.log('   المنافذ المفتوحة:');
            results.ports.forEach(p => {
                console.log(`     - ${p.port}/${p.protocol} (${p.service})`);
            });
        } else {
            console.log('   ⚠️ لم يتم اكتشاف منافذ مفتوحة');
        }
        console.log('');
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    }
    
    // اختبار 2: فحص عنوان خارجي (Google DNS)
    console.log('2️⃣ اختبار فحص عنوان خارجي (8.8.8.8)...');
    console.log('');
    
    try {
        const results = await scanner.scanHost('8.8.8.8', 'quick');
        
        console.log('✅ النتائج:');
        console.log(`   Success: ${results.success}`);
        console.log(`   Hosts up: ${results.stats?.hosts_up || 0}`);
        console.log(`   Open ports: ${results.stats?.open_ports || 0}`);
        console.log(`   Scan time: ${results.stats?.scan_time || 0}s`);
        console.log('');
        
        if (results.ports && results.ports.length > 0) {
            console.log('   المنافذ المفتوحة:');
            results.ports.forEach(p => {
                console.log(`     - ${p.port}/${p.protocol} (${p.service})`);
            });
        } else {
            console.log('   ⚠️ لم يتم اكتشاف منافذ مفتوحة (قد يكون محمي بجدار ناري)');
        }
        console.log('');
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    }
    
    // اختبار 3: فحص عنوان غير موجود
    console.log('3️⃣ اختبار فحص عنوان غير موجود (192.168.255.255)...');
    console.log('');
    
    try {
        const results = await scanner.scanHost('192.168.255.255', 'quick');
        
        console.log('✅ النتائج:');
        console.log(`   Success: ${results.success}`);
        console.log(`   Hosts up: ${results.stats?.hosts_up || 0}`);
        console.log(`   Message: ${results.message || 'N/A'}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    }
    
    console.log('='.repeat(60));
    console.log('انتهى الاختبار');
    console.log('='.repeat(60));
}

// تشغيل الاختبار
testScanner().catch(console.error);
