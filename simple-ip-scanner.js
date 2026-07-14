/**
 * Simple IP Scanner - فحص IP بسيط بدون الحاجة لـ Nmap
 * يستخدم Node.js فقط للفحص الأساسي
 */

const net = require('net');
const dns = require('dns').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SimpleIPScanner {
    constructor() {
        // المنافذ الشائعة للفحص السريع
        this.commonPorts = [
            21,   // FTP
            22,   // SSH
            23,   // Telnet
            25,   // SMTP
            53,   // DNS
            80,   // HTTP
            110,  // POP3
            143,  // IMAP
            443,  // HTTPS
            445,  // SMB
            3306, // MySQL
            3389, // RDP
            5432, // PostgreSQL
            8080, // HTTP Alt
            8443  // HTTPS Alt
        ];
        
        this.serviceNames = {
            21: 'FTP',
            22: 'SSH',
            23: 'Telnet',
            25: 'SMTP',
            53: 'DNS',
            80: 'HTTP',
            110: 'POP3',
            143: 'IMAP',
            443: 'HTTPS',
            445: 'SMB',
            3306: 'MySQL',
            3389: 'RDP',
            5432: 'PostgreSQL',
            8080: 'HTTP-Proxy',
            8443: 'HTTPS-Alt'
        };
    }

    /**
     * فحص منفذ واحد
     */
    async scanPort(host, port, timeout = 2000) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let isResolved = false;

            const onError = () => {
                if (!isResolved) {
                    isResolved = true;
                    socket.destroy();
                    resolve({ port, state: 'closed' });
                }
            };

            socket.setTimeout(timeout);
            socket.on('timeout', onError);
            socket.on('error', onError);

            socket.connect(port, host, () => {
                if (!isResolved) {
                    isResolved = true;
                    socket.destroy();
                    resolve({
                        port,
                        state: 'open',
                        service: this.serviceNames[port] || 'unknown'
                    });
                }
            });
        });
    }

    /**
     * فحص عدة منافذ
     */
    async scanPorts(host, ports) {
        console.log(`Scanning ${ports.length} ports on ${host}...`);
        const results = await Promise.all(
            ports.map(port => this.scanPort(host, port))
        );
        return results.filter(r => r.state === 'open');
    }

    /**
     * التحقق من أن الهوست متاح (ping)
     */
    async isHostAlive(host) {
        try {
            // محاولة الاتصال بمنفذ شائع
            const result = await this.scanPort(host, 80, 1000);
            if (result.state === 'open') return true;
            
            // محاولة منفذ آخر
            const result2 = await this.scanPort(host, 443, 1000);
            if (result2.state === 'open') return true;
            
            // محاولة DNS lookup
            try {
                await dns.lookup(host);
                return true;
            } catch (e) {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * الحصول على hostname
     */
    async getHostname(ip) {
        try {
            const hostnames = await dns.reverse(ip);
            return hostnames[0] || '';
        } catch (error) {
            return '';
        }
    }

    /**
     * فحص شامل لـ IP
     */
    async scanHost(target, scanType = 'quick') {
        const startTime = Date.now();
        
        try {
            console.log(`Starting ${scanType} scan on ${target}...`);
            
            // التحقق من أن الهوست متاح
            const isAlive = await this.isHostAlive(target);
            
            if (!isAlive) {
                return {
                    success: true,
                    timestamp: new Date().toISOString(),
                    stats: {
                        total_hosts: 1,
                        hosts_up: 0,
                        total_ports: 0,
                        open_ports: 0,
                        scan_time: ((Date.now() - startTime) / 1000).toFixed(2)
                    },
                    hosts: [],
                    ports: [],
                    services: [],
                    message: 'Host appears to be down or unreachable'
                };
            }

            // تحديد المنافذ للفحص
            let portsToScan = this.commonPorts;
            if (scanType === 'full') {
                // فحص المنافذ من 1 إلى 1000
                portsToScan = Array.from({ length: 1000 }, (_, i) => i + 1);
            } else if (scanType === 'comprehensive') {
                // فحص المنافذ من 1 إلى 10000
                portsToScan = Array.from({ length: 10000 }, (_, i) => i + 1);
            }

            // فحص المنافذ
            const openPorts = await this.scanPorts(target, portsToScan);
            
            // الحصول على hostname
            const hostname = await this.getHostname(target);

            // بناء النتائج
            const hostInfo = {
                ip: target,
                hostname: hostname,
                state: 'up',
                protocols: ['tcp']
            };

            const ports = openPorts.map(p => ({
                host: target,
                port: p.port,
                protocol: 'tcp',
                state: 'open',
                service: p.service,
                product: '',
                version: '',
                extrainfo: ''
            }));

            const services = openPorts.map(p => ({
                host: target,
                port: p.port,
                name: p.service,
                product: '',
                version: '',
                cpe: ''
            }));

            const stats = {
                total_hosts: 1,
                hosts_up: 1,
                total_ports: portsToScan.length,
                open_ports: openPorts.length,
                scan_time: ((Date.now() - startTime) / 1000).toFixed(2)
            };

            return {
                success: true,
                timestamp: new Date().toISOString(),
                stats: stats,
                hosts: [hostInfo],
                ports: ports,
                services: services,
                scan_type: scanType
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * فحص نطاق IP
     */
    async scanRange(startIP, endIP, scanType = 'quick') {
        // TODO: تنفيذ فحص نطاق
        console.log(`Scanning range ${startIP} - ${endIP} not implemented yet`);
        return {
            success: false,
            error: 'Range scanning not implemented yet'
        };
    }
}

// استخدام من سطر الأوامر
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node simple-ip-scanner.js <target> [scan-type]');
        console.log('Scan types: quick, full, comprehensive');
        process.exit(1);
    }

    const target = args[0];
    const scanType = args[1] || 'quick';

    const scanner = new SimpleIPScanner();
    
    scanner.scanHost(target, scanType)
        .then(results => {
            console.log(JSON.stringify(results, null, 2));
        })
        .catch(error => {
            console.error('Scan error:', error);
            process.exit(1);
        });
}

module.exports = SimpleIPScanner;
