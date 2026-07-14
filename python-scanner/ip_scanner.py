#!/usr/bin/env python3
"""
IP Scanner using Python-nmap
بديل لـ Nmap يعمل مع Python
"""

import nmap
import json
import sys
import argparse
from datetime import datetime

class IPScanner:
    def __init__(self):
        self.nm = nmap.PortScanner()
    
    def scan_host(self, target, scan_type='quick'):
        """
        فحص هدف محدد
        
        Args:
            target: عنوان IP أو نطاق (مثل: 192.168.1.1 أو 192.168.1.0/24)
            scan_type: نوع الفحص (quick, full, stealth, service)
        
        Returns:
            dict: نتائج الفحص بصيغة JSON
        """
        
        # تحديد معاملات الفحص حسب النوع
        scan_args = self._get_scan_arguments(scan_type)
        
        try:
            print(f"Starting scan on {target}...", file=sys.stderr)
            
            # تنفيذ الفحص
            self.nm.scan(hosts=target, arguments=scan_args)
            
            # تحليل النتائج
            results = self._parse_results()
            
            return results
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def _get_scan_arguments(self, scan_type):
        """تحديد معاملات Nmap حسب نوع الفحص"""
        
        scan_types = {
            'quick': '-T4 -F',  # فحص سريع للمنافذ الشائعة
            'full': '-T4 -p-',  # فحص كامل لجميع المنافذ
            'stealth': '-sS -T2',  # فحص خفي
            'service': '-sV -T4',  # فحص الخدمات
            'os': '-O -T4',  # فحص نظام التشغيل
            'comprehensive': '-sV -sC -O -T4'  # فحص شامل
        }
        
        return scan_types.get(scan_type, scan_types['quick'])
    
    def _parse_results(self):
        """تحليل نتائج الفحص"""
        
        hosts = []
        ports = []
        services = []
        
        for host in self.nm.all_hosts():
            host_info = {
                'ip': host,
                'hostname': self.nm[host].hostname() if self.nm[host].hostname() else '',
                'state': self.nm[host].state(),
                'protocols': []
            }
            
            # معلومات نظام التشغيل
            if 'osmatch' in self.nm[host]:
                os_matches = self.nm[host]['osmatch']
                if os_matches:
                    host_info['os'] = {
                        'name': os_matches[0]['name'],
                        'accuracy': os_matches[0]['accuracy']
                    }
            
            # فحص البروتوكولات
            for proto in self.nm[host].all_protocols():
                host_info['protocols'].append(proto)
                
                # فحص المنافذ
                ports_list = self.nm[host][proto].keys()
                
                for port in ports_list:
                    port_info = self.nm[host][proto][port]
                    
                    port_data = {
                        'host': host,
                        'port': port,
                        'protocol': proto,
                        'state': port_info['state'],
                        'service': port_info.get('name', 'unknown'),
                        'product': port_info.get('product', ''),
                        'version': port_info.get('version', ''),
                        'extrainfo': port_info.get('extrainfo', '')
                    }
                    
                    ports.append(port_data)
                    
                    # إضافة معلومات الخدمة
                    if port_info['state'] == 'open':
                        service_data = {
                            'host': host,
                            'port': port,
                            'name': port_info.get('name', 'unknown'),
                            'product': port_info.get('product', ''),
                            'version': port_info.get('version', ''),
                            'cpe': port_info.get('cpe', '')
                        }
                        services.append(service_data)
            
            hosts.append(host_info)
        
        # إحصائيات الفحص
        stats = {
            'total_hosts': len(hosts),
            'hosts_up': len([h for h in hosts if h['state'] == 'up']),
            'total_ports': len(ports),
            'open_ports': len([p for p in ports if p['state'] == 'open']),
            'scan_time': self.nm.scanstats()['elapsed']
        }
        
        return {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'stats': stats,
            'hosts': hosts,
            'ports': ports,
            'services': services,
            'raw_output': self.nm.csv()
        }

def main():
    parser = argparse.ArgumentParser(description='IP Scanner using Python-nmap')
    parser.add_argument('target', help='Target IP or range (e.g., 192.168.1.1 or 192.168.1.0/24)')
    parser.add_argument('--type', default='quick', 
                       choices=['quick', 'full', 'stealth', 'service', 'os', 'comprehensive'],
                       help='Scan type')
    parser.add_argument('--output', default='json', choices=['json', 'text'],
                       help='Output format')
    
    args = parser.parse_args()
    
    scanner = IPScanner()
    results = scanner.scan_host(args.target, args.type)
    
    if args.output == 'json':
        print(json.dumps(results, indent=2, ensure_ascii=False))
    else:
        # عرض نصي مبسط
        if results['success']:
            print(f"\n=== Scan Results for {args.target} ===")
            print(f"Hosts found: {results['stats']['total_hosts']}")
            print(f"Hosts up: {results['stats']['hosts_up']}")
            print(f"Open ports: {results['stats']['open_ports']}")
            print(f"\nHosts:")
            for host in results['hosts']:
                print(f"  - {host['ip']} ({host['hostname']}) - {host['state']}")
                if 'os' in host:
                    print(f"    OS: {host['os']['name']} ({host['os']['accuracy']}%)")
            
            print(f"\nOpen Ports:")
            for port in results['ports']:
                if port['state'] == 'open':
                    print(f"  - {port['host']}:{port['port']}/{port['protocol']} - {port['service']}")
                    if port['product']:
                        print(f"    {port['product']} {port['version']}")
        else:
            print(f"Error: {results['error']}", file=sys.stderr)
            sys.exit(1)

if __name__ == '__main__':
    main()
