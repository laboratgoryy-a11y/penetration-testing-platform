#!/usr/bin/env python3
"""
Network Discovery - اكتشاف الأجهزة على الشبكة المحلية
يكتشف جميع الأجهزة المتصلة بنفس الشبكة
"""

import socket
import struct
import ipaddress
import json
import sys
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import platform
import subprocess

class NetworkDiscovery:
    def __init__(self):
        self.discovered_hosts = []
        self.local_ip = None
        self.network_range = None
    
    def get_local_ip(self):
        """الحصول على IP المحلي للجهاز"""
        try:
            # إنشاء socket للحصول على IP المحلي
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except Exception as e:
            print(f"Error getting local IP: {e}", file=sys.stderr)
            return "127.0.0.1"
    
    def get_network_range(self, ip_address):
        """حساب نطاق الشبكة من IP المحلي"""
        try:
            # افتراض subnet mask /24 (255.255.255.0)
            network = ipaddress.IPv4Network(f"{ip_address}/24", strict=False)
            return str(network)
        except Exception as e:
            print(f"Error calculating network range: {e}", file=sys.stderr)
            return None
    
    def ping_host(self, ip):
        """فحص إذا كان الجهاز متصل باستخدام ping"""
        try:
            # تحديد الأمر حسب نظام التشغيل
            param = '-n' if platform.system().lower() == 'windows' else '-c'
            command = ['ping', param, '1', '-w', '1000', ip]
            
            # تنفيذ ping
            result = subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=2
            )
            
            return result.returncode == 0
        except Exception:
            return False
    
    def get_hostname(self, ip):
        """محاولة الحصول على اسم الجهاز"""
        try:
            hostname = socket.gethostbyaddr(ip)[0]
            return hostname
        except:
            return ""
    
    def get_mac_address(self, ip):
        """محاولة الحصول على MAC address (Windows فقط)"""
        try:
            if platform.system().lower() == 'windows':
                # استخدام arp للحصول على MAC
                result = subprocess.run(
                    ['arp', '-a', ip],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=2
                )
                output = result.stdout.decode('utf-8', errors='ignore')
                
                # البحث عن MAC address في النتيجة
                for line in output.split('\n'):
                    if ip in line:
                        parts = line.split()
                        for part in parts:
                            if '-' in part and len(part) == 17:
                                return part
                            elif ':' in part and len(part) == 17:
                                return part
            return ""
        except:
            return ""
    
    def scan_host(self, ip):
        """فحص جهاز واحد"""
        try:
            # فحص إذا كان الجهاز متصل
            if self.ping_host(ip):
                hostname = self.get_hostname(ip)
                mac = self.get_mac_address(ip)
                
                host_info = {
                    'ip': ip,
                    'hostname': hostname,
                    'mac': mac,
                    'state': 'up',
                    'is_local': ip == self.local_ip
                }
                
                print(f"Found: {ip} ({hostname})", file=sys.stderr)
                return host_info
            
            return None
        except Exception as e:
            print(f"Error scanning {ip}: {e}", file=sys.stderr)
            return None
    
    def discover_network(self, max_workers=50):
        """اكتشاف جميع الأجهزة على الشبكة"""
        
        print("Starting network discovery...", file=sys.stderr)
        
        # الحصول على IP المحلي
        self.local_ip = self.get_local_ip()
        print(f"Local IP: {self.local_ip}", file=sys.stderr)
        
        # حساب نطاق الشبكة
        self.network_range = self.get_network_range(self.local_ip)
        if not self.network_range:
            return {
                'success': False,
                'error': 'Failed to calculate network range'
            }
        
        print(f"Network range: {self.network_range}", file=sys.stderr)
        
        # إنشاء قائمة بجميع IPs في النطاق
        network = ipaddress.IPv4Network(self.network_range)
        ip_list = [str(ip) for ip in network.hosts()]
        
        print(f"Scanning {len(ip_list)} hosts...", file=sys.stderr)
        
        # فحص جميع IPs بشكل متوازي
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(self.scan_host, ip): ip for ip in ip_list}
            
            for future in as_completed(futures):
                result = future.result()
                if result:
                    self.discovered_hosts.append(result)
        
        print(f"Discovery completed. Found {len(self.discovered_hosts)} hosts", file=sys.stderr)
        
        # ترتيب النتائج حسب IP
        self.discovered_hosts.sort(key=lambda x: ipaddress.IPv4Address(x['ip']))
        
        return {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'local_ip': self.local_ip,
            'network_range': self.network_range,
            'total_scanned': len(ip_list),
            'hosts_found': len(self.discovered_hosts),
            'hosts': self.discovered_hosts
        }
    
    def quick_scan(self, subnet_size=24):
        """فحص سريع للشبكة المحلية"""
        return self.discover_network(max_workers=100)

def main():
    parser = argparse.ArgumentParser(description='Network Discovery - اكتشاف الأجهزة على الشبكة')
    parser.add_argument('--quick', action='store_true', help='فحص سريع')
    parser.add_argument('--workers', type=int, default=50, help='عدد الـ threads (افتراضي: 50)')
    parser.add_argument('--output', default='json', choices=['json', 'text'], help='صيغة الإخراج')
    
    args = parser.parse_args()
    
    discovery = NetworkDiscovery()
    
    if args.quick:
        results = discovery.quick_scan()
    else:
        results = discovery.discover_network(max_workers=args.workers)
    
    if args.output == 'json':
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        # عرض نصي
        if results['success']:
            print(f"\n=== Network Discovery Results ===")
            print(f"Local IP: {results['local_ip']}")
            print(f"Network Range: {results['network_range']}")
            print(f"Hosts Found: {results['hosts_found']}/{results['total_scanned']}")
            print(f"\nDiscovered Hosts:")
            print("-" * 80)
            print(f"{'IP Address':<15} {'Hostname':<30} {'MAC Address':<20} {'Status'}")
            print("-" * 80)
            
            for host in results['hosts']:
                local_marker = " (LOCAL)" if host['is_local'] else ""
                print(f"{host['ip']:<15} {host['hostname']:<30} {host['mac']:<20} {host['state']}{local_marker}")
        else:
            print(f"Error: {results['error']}", file=sys.stderr)
            sys.exit(1)

if __name__ == '__main__':
    main()
