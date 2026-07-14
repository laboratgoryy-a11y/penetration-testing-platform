(function () {
    class IPScanReportNormalizer {
        constructor() {
            this.serviceCatalog = new Map([
                [21, { name: 'FTP', category: 'File Sharing', confidence: 'high', risk: 'high', description: 'خدمة نقل ملفات قديمة وقد تعرض الاعتمادات أو المحتوى دون حماية كافية.' }],
                [22, { name: 'SSH', category: 'Remote Access', confidence: 'high', risk: 'medium', description: 'وصول إداري عن بعد. يحتاج تقييد مصادر الوصول وتعطيل كلمات المرور عند الإمكان.' }],
                [23, { name: 'Telnet', category: 'Remote Access', confidence: 'high', risk: 'critical', description: 'خدمة وصول عن بعد غير مشفرة ويجب اعتبارها عالية الخطورة.' }],
                [25, { name: 'SMTP', category: 'Infrastructure', confidence: 'high', risk: 'medium', description: 'خدمة بريد تحتاج مراجعة relay والحد من التعرض غير الضروري.' }],
                [53, { name: 'DNS', category: 'Infrastructure', confidence: 'high', risk: 'medium', description: 'خدمة بنية تحتية حساسة، خصوصًا إن كانت مكشوفة خارج النطاق المقصود.' }],
                [80, { name: 'HTTP', category: 'Web Services', confidence: 'high', risk: 'medium', description: 'خدمة ويب غير مشفرة. يفضل تحويلها إلى HTTPS أو حصر استخدامها داخليًا.' }],
                [110, { name: 'POP3', category: 'Infrastructure', confidence: 'high', risk: 'medium', description: 'خدمة بريد قديمة نسبيًا وتحتاج مراجعة الحماية والتشفير.' }],
                [123, { name: 'NTP', category: 'Infrastructure', confidence: 'high', risk: 'low', description: 'خدمة مزامنة وقت. يلزم التحقق من أنها لا تعمل كخادم عام دون حاجة.' }],
                [135, { name: 'MSRPC', category: 'Infrastructure', confidence: 'high', risk: 'high', description: 'خدمات RPC تزيد سطح الهجوم داخل الشبكات المؤسسية.' }],
                [137, { name: 'NetBIOS-NS', category: 'File Sharing', confidence: 'high', risk: 'medium', description: 'خدمة اكتشاف قد تكشف معلومات بيئية لا حاجة لعرضها.' }],
                [138, { name: 'NetBIOS-DGM', category: 'File Sharing', confidence: 'high', risk: 'medium', description: 'خدمة NetBIOS مرتبطة بالمشاركة القديمة وتحتاج مراجعة.' }],
                [139, { name: 'NetBIOS-SSN', category: 'File Sharing', confidence: 'high', risk: 'high', description: 'مشاركة ملفات قديمة وأكثر حساسية من حيث الحركة الجانبية.' }],
                [143, { name: 'IMAP', category: 'Infrastructure', confidence: 'high', risk: 'medium', description: 'خدمة بريد تحتاج تشفيرًا وتقييدًا واضحًا.' }],
                [161, { name: 'SNMP', category: 'Infrastructure', confidence: 'high', risk: 'high', description: 'قد تكشف معلومات تشغيلية واسعة إن كانت community strings ضعيفة.' }],
                [389, { name: 'LDAP', category: 'Infrastructure', confidence: 'high', risk: 'high', description: 'خدمة دليل حساسة تحتاج ضوابط وصول صارمة.' }],
                [443, { name: 'HTTPS', category: 'Web Services', confidence: 'high', risk: 'low', description: 'خدمة ويب مشفرة. ما زالت تحتاج مراجعة الشهادات والإعدادات.' }],
                [445, { name: 'SMB', category: 'File Sharing', confidence: 'high', risk: 'critical', description: 'خدمة مشاركة ملفات حساسة جدًا ويجب مراجعة كشفها بدقة.' }],
                [554, { name: 'RTSP', category: 'Other', confidence: 'high', risk: 'medium', description: 'خدمة بث قد تكشف كاميرات أو أجهزة مراقبة.' }],
                [587, { name: 'Submission', category: 'Infrastructure', confidence: 'high', risk: 'medium', description: 'خدمة إرسال بريد تحتاج مصادقة وتشفير مناسبين.' }],
                [636, { name: 'LDAPS', category: 'Infrastructure', confidence: 'high', risk: 'medium', description: 'LDAP مشفر، لكنه ما يزال خدمة بنية حساسة.' }],
                [993, { name: 'IMAPS', category: 'Infrastructure', confidence: 'high', risk: 'low', description: 'بريد مشفر، مع حاجة لمراجعة التهيئة والاعتماد.' }],
                [995, { name: 'POP3S', category: 'Infrastructure', confidence: 'high', risk: 'low', description: 'خدمة بريد مشفرة تتطلب ضبط سياسات وصول مناسبة.' }],
                [1433, { name: 'MSSQL', category: 'Databases', confidence: 'high', risk: 'high', description: 'قاعدة بيانات مكشوفة تتطلب حصر الوصول والاعتماد القوي.' }],
                [1521, { name: 'Oracle', category: 'Databases', confidence: 'high', risk: 'high', description: 'خدمة قواعد بيانات مؤسسية يجب حصرها وتدقيقها.' }],
                [3306, { name: 'MySQL', category: 'Databases', confidence: 'high', risk: 'high', description: 'خدمة قاعدة بيانات تحتاج تقييدًا واضحًا وعدم كشفها خارجيًا.' }],
                [3389, { name: 'RDP', category: 'Remote Access', confidence: 'high', risk: 'high', description: 'وصول مكتبي عن بعد يجب عزله ومراقبته بعناية.' }],
                [5432, { name: 'PostgreSQL', category: 'Databases', confidence: 'high', risk: 'high', description: 'خدمة قاعدة بيانات يجب مراجعة التعرض والاعتماد لها.' }],
                [5900, { name: 'VNC', category: 'Remote Access', confidence: 'high', risk: 'high', description: 'وصول رسومي عن بعد يحتاج تشفيرًا وعزلًا مناسبين.' }],
                [6379, { name: 'Redis', category: 'Databases', confidence: 'high', risk: 'critical', description: 'Redis المكشوفة قد تكون عالية الخطورة إن غابت المصادقة أو العزل.' }],
                [8008, { name: 'HTTP-Alt', category: 'Web Services', confidence: 'high', risk: 'medium', description: 'خدمة ويب بديلة تحتاج مراجعة التهيئة والتعرض.' }],
                [8009, { name: 'AJP', category: 'Infrastructure', confidence: 'high', risk: 'high', description: 'واجهة ربط تطبيقات يجب ألا تبقى مكشوفة بلا حاجة.' }],
                [8080, { name: 'HTTP-Alt', category: 'Web Services', confidence: 'high', risk: 'medium', description: 'خدمة ويب بديلة، وغالبًا ما تستحق تدقيقًا خاصًا.' }],
                [8443, { name: 'HTTPS-Alt', category: 'Web Services', confidence: 'high', risk: 'low', description: 'خدمة ويب مشفرة على منفذ بديل تحتاج مراجعة الشهادات والتهيئة.' }],
                [27017, { name: 'MongoDB', category: 'Databases', confidence: 'high', risk: 'critical', description: 'MongoDB المكشوفة قد تعرض البيانات مباشرة إن لم تكن محمية.' }],
            ]);
        }

        parseUploadedReport(fileName, content) {
            const extension = String(fileName || '').split('.').pop()?.toLowerCase() || '';
            if (extension === 'json') {
                return this.normalizeJson(JSON.parse(content), fileName);
            }
            if (extension === 'xml') {
                return this.normalizeXml(content, fileName);
            }
            if (extension === 'csv') {
                return this.normalizeCsv(content, fileName);
            }
            throw new Error('صيغة الملف غير مدعومة. الرجاء استيراد ملف JSON أو XML أو CSV.');
        }

        normalizeApiResults(scanData, resultsData) {
            const targetValue = resultsData?.targetValue || scanData?.target_value || scanData?.targetValue || 'غير متاح';
            const startedAt = scanData?.started_at || scanData?.startedAt || scanData?.created_at || scanData?.createdAt || new Date().toISOString();
            const finishedAt = scanData?.completed_at || scanData?.completedAt || scanData?.updated_at || scanData?.updatedAt || new Date().toISOString();
            const hostRows = Array.isArray(resultsData?.hosts) ? resultsData.hosts : [];
            const ports = Array.isArray(resultsData?.ports) ? resultsData.ports : [];
            const services = Array.isArray(resultsData?.services) ? resultsData.services : [];
            const vulnerabilities = Array.isArray(resultsData?.vulnerabilities) ? resultsData.vulnerabilities : [];
            const limitations = Array.isArray(resultsData?.limitations) ? resultsData.limitations : [];

            return this.finalizeReport({
                sourceType: 'runtime-scan',
                sourceName: scanData?.id || 'runtime-scan',
                targetValue,
                targetType: scanData?.target_type || scanData?.targetType || 'ip',
                executionMode: resultsData?.executionMode || 'native-tcp',
                startedAt,
                finishedAt,
                hostStatus: hostRows[0]?.status || 'unknown',
                hostname: hostRows[0]?.hostname || null,
                reverseDns: hostRows[0]?.reverse_dns || hostRows[0]?.hostname || null,
                latencyMs: hostRows[0]?.latency_ms ?? null,
                hosts: hostRows.map((host) => this.normalizeHost(host)),
                ports: ports.map((port) => this.normalizePort(port)),
                services: services.map((service) => this.normalizeService(service)),
                findings: vulnerabilities.map((finding) => this.normalizeFinding(finding)),
                limitations,
                timeline: this.buildSyntheticTimeline(startedAt, finishedAt, resultsData),
                parsingErrors: [],
                unavailableFields: this.collectUnavailableFields(hostRows, ports),
            });
        }

        normalizeJson(payload, fileName = 'imported-report.json') {
            const scan = payload.scan || payload.job || payload.report || payload;
            const results = scan.results || payload.results || payload.data || payload.summary || payload;
            const hostRows = this.asArray(results.hosts || results.devices || payload.hosts || payload.devices);
            const ports = this.asArray(results.ports || payload.ports);
            const services = this.asArray(results.services || payload.services);
            const vulnerabilities = this.asArray(results.vulnerabilities || results.findings || payload.vulnerabilities || payload.findings);
            const targetValue = results.targetValue || payload.targetValue || scan.target_value || scan.target || hostRows[0]?.ip_address || hostRows[0]?.ip || 'غير متاح';
            const startedAt = scan.started_at || scan.startedAt || payload.startedAt || payload.scan_started_at || new Date().toISOString();
            const finishedAt = scan.completed_at || scan.completedAt || payload.finishedAt || payload.scan_completed_at || startedAt;

            return this.finalizeReport({
                sourceType: 'imported-json',
                sourceName: fileName,
                targetValue,
                targetType: payload.targetType || scan.target_type || 'ip',
                executionMode: payload.executionMode || results.executionMode || 'imported',
                startedAt,
                finishedAt,
                hostStatus: results.hostStatus || scan.status || hostRows[0]?.status || 'unknown',
                hostname: payload.hostname || results.hostname || hostRows[0]?.hostname || null,
                reverseDns: payload.reverseDns || results.reverseDns || hostRows[0]?.reverse_dns || null,
                latencyMs: payload.latencyMs || results.latencyMs || hostRows[0]?.latency_ms || null,
                hosts: hostRows.map((host) => this.normalizeHost(host)),
                ports: ports.map((port) => this.normalizePort(port)),
                services: services.map((service) => this.normalizeService(service)),
                findings: vulnerabilities.map((finding) => this.normalizeFinding(finding)),
                limitations: this.asArray(results.limitations || payload.limitations),
                timeline: this.normalizeTimeline(results.timeline || payload.timeline || this.buildSyntheticTimeline(startedAt, finishedAt, results)),
                parsingErrors: [],
                unavailableFields: this.collectUnavailableFields(hostRows, ports),
            });
        }

        normalizeXml(xmlText, fileName = 'imported-report.xml') {
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlText, 'application/xml');
            const parserErrors = Array.from(xml.getElementsByTagName('parsererror')).map((node) => node.textContent?.trim()).filter(Boolean);
            const hostNodes = Array.from(xml.getElementsByTagName('host'));

            const hosts = hostNodes.map((hostNode) => {
                const ipv4 = Array.from(hostNode.getElementsByTagName('address')).find((node) => node.getAttribute('addrtype') === 'ipv4');
                const mac = Array.from(hostNode.getElementsByTagName('address')).find((node) => node.getAttribute('addrtype') === 'mac');
                const hostname = hostNode.querySelector('hostnames hostname')?.getAttribute('name') || null;
                const osName = hostNode.querySelector('os osmatch')?.getAttribute('name') || null;
                const status = hostNode.querySelector('status')?.getAttribute('state') || 'unknown';
                const latency = hostNode.querySelector('times')?.getAttribute('srtt');

                return this.normalizeHost({
                    ip_address: ipv4?.getAttribute('addr'),
                    mac_address: mac?.getAttribute('addr'),
                    vendor: mac?.getAttribute('vendor'),
                    hostname,
                    os_name: osName,
                    status,
                    latency_ms: latency ? Math.round(Number(latency) / 1000) : null,
                });
            });

            const ports = hostNodes.flatMap((hostNode) => {
                const ip = Array.from(hostNode.getElementsByTagName('address')).find((node) => node.getAttribute('addrtype') === 'ipv4')?.getAttribute('addr') || null;
                return Array.from(hostNode.getElementsByTagName('port')).map((portNode) => this.normalizePort({
                    ip_address: ip,
                    port: portNode.getAttribute('portid'),
                    protocol: portNode.getAttribute('protocol'),
                    state: portNode.querySelector('state')?.getAttribute('state') || 'unknown',
                    service_name: portNode.querySelector('service')?.getAttribute('name'),
                    service_product: portNode.querySelector('service')?.getAttribute('product'),
                    service_version: portNode.querySelector('service')?.getAttribute('version'),
                    banner: portNode.querySelector('service')?.getAttribute('extrainfo')
                }));
            });

            const findings = hostNodes.flatMap((hostNode) => {
                const ip = Array.from(hostNode.getElementsByTagName('address')).find((node) => node.getAttribute('addrtype') === 'ipv4')?.getAttribute('addr') || null;
                return Array.from(hostNode.querySelectorAll('port script')).map((scriptNode) => this.normalizeFinding({
                    ip_address: ip,
                    port: scriptNode.parentElement?.getAttribute('portid'),
                    type: scriptNode.getAttribute('id'),
                    title: scriptNode.getAttribute('id'),
                    description: scriptNode.getAttribute('output'),
                    severity: 'medium',
                    confidence: 'medium'
                }));
            });

            const services = ports.filter((port) => port.state === 'open').map((port) => this.normalizeService(port));
            const startedAt = xml.querySelector('nmaprun')?.getAttribute('startstr') || new Date().toISOString();
            const finishedAt = new Date().toISOString();

            return this.finalizeReport({
                sourceType: 'imported-xml',
                sourceName: fileName,
                targetValue: hosts[0]?.ip_address || 'غير متاح',
                targetType: 'ip',
                executionMode: 'xml-import',
                startedAt,
                finishedAt,
                hostStatus: hosts[0]?.status || 'unknown',
                hostname: hosts[0]?.hostname || null,
                reverseDns: hosts[0]?.reverse_dns || hosts[0]?.hostname || null,
                latencyMs: hosts[0]?.latency_ms || null,
                hosts,
                ports,
                services,
                findings,
                limitations: [],
                timeline: this.buildSyntheticTimeline(startedAt, finishedAt, { parserErrors }),
                parsingErrors: parserErrors,
                unavailableFields: this.collectUnavailableFields(hosts, ports),
            });
        }

        normalizeCsv(csvText, fileName = 'imported-report.csv') {
            const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
            if (lines.length < 2) {
                throw new Error('ملف CSV لا يحتوي على صفوف كافية للتحليل.');
            }

            const headers = lines[0].split(',').map((header) => header.trim().toLowerCase());
            const rows = lines.slice(1).map((line) => {
                const values = line.split(',').map((value) => value.trim());
                return headers.reduce((record, header, index) => {
                    record[header] = values[index] || '';
                    return record;
                }, {});
            });

            const ports = rows.map((row) => this.normalizePort(row));
            const hostsMap = new Map();
            for (const row of rows) {
                const host = this.normalizeHost(row);
                const key = host.ip_address || host.hostname || fileName;
                if (!hostsMap.has(key)) {
                    hostsMap.set(key, host);
                }
            }

            const hosts = Array.from(hostsMap.values());
            const services = ports.filter((port) => port.state === 'open').map((port) => this.normalizeService(port));
            const findings = rows.filter((row) => row.cve || row.risk || row.severity || row.finding).map((row) => this.normalizeFinding(row));
            const startedAt = new Date().toISOString();
            const finishedAt = startedAt;

            return this.finalizeReport({
                sourceType: 'imported-csv',
                sourceName: fileName,
                targetValue: hosts[0]?.ip_address || 'غير متاح',
                targetType: 'ip',
                executionMode: 'csv-import',
                startedAt,
                finishedAt,
                hostStatus: hosts[0]?.status || 'unknown',
                hostname: hosts[0]?.hostname || null,
                reverseDns: hosts[0]?.reverse_dns || hosts[0]?.hostname || null,
                latencyMs: hosts[0]?.latency_ms || null,
                hosts,
                ports,
                services,
                findings,
                limitations: [],
                timeline: this.buildSyntheticTimeline(startedAt, finishedAt, {}),
                parsingErrors: [],
                unavailableFields: this.collectUnavailableFields(hosts, ports),
            });
        }

        normalizeHost(host) {
            return {
                ip_address: host.ip_address || host.ip || host.address || null,
                mac_address: host.mac_address || host.mac || null,
                hostname: host.hostname || host.host || null,
                reverse_dns: host.reverse_dns || host.reverseDns || host.ptr || null,
                vendor: host.vendor || host.manufacturer || null,
                os_name: host.os_name || host.os || host.os_family || null,
                status: String(host.status || host.state || 'unknown').toLowerCase(),
                latency_ms: this.toNumber(host.latency_ms ?? host.rtt ?? host.response_time_ms),
                port_count: this.toNumber(host.port_count ?? host.open_ports),
                vulnerability_count: this.toNumber(host.vulnerability_count ?? host.risk_count),
            };
        }

        normalizePort(port) {
            const portNumber = this.toNumber(port.port ?? port.portid ?? port.number);
            const mapping = this.getServiceMapping(port.service_name || port.service || port.name, portNumber);
            const state = String(port.state || port.status || 'unknown').toLowerCase();
            const versionText = [port.service_product, port.product, port.service_version, port.version, port.banner]
                .filter(Boolean)
                .join(' ')
                .trim();
            const serviceName = port.service_name || port.service || port.name || mapping.name || null;
            const riskLevel = state === 'open' ? String(port.risk || port.risk_level || mapping.risk || 'low').toLowerCase() : 'low';
            const confidence = String(port.confidence || mapping.confidence || (serviceName ? 'medium' : 'low')).toLowerCase();

            return {
                ip_address: port.ip_address || port.ip || null,
                port: portNumber,
                protocol: String(port.protocol || port.transport || 'tcp').toLowerCase(),
                state,
                service_name: serviceName,
                service_product: port.service_product || port.product || null,
                service_version: port.service_version || port.version || null,
                banner: port.banner || versionText || null,
                description: port.description || mapping.description || (serviceName ? `تم ربط المنفذ ${portNumber} بخدمة ${serviceName}.` : 'خدمة غير معروفة من المصدر المتاح.'),
                response_time_ms: this.toNumber(port.response_time_ms ?? port.latency_ms),
                risk_level: riskLevel,
                risk_reason: port.risk_reason || this.buildRiskReason(mapping, state),
                recommendation: port.recommendation || this.buildPortRecommendation(serviceName, mapping.category, riskLevel),
                priority: this.toPriority(riskLevel),
                confidence,
                service_category: mapping.category || 'Other',
                service_label: serviceName || 'غير معروف',
            };
        }

        normalizeService(service) {
            const portNumber = this.toNumber(service.port ?? service.portid);
            const mapping = this.getServiceMapping(service.service_name || service.service || service.name, portNumber);
            const serviceName = service.service_name || service.service || service.name || mapping.name || null;
            return {
                ip_address: service.ip_address || service.ip || null,
                port: portNumber,
                service_name: serviceName,
                transport: String(service.transport || service.protocol || 'tcp').toLowerCase(),
                service_product: service.service_product || service.product || null,
                service_version: service.service_version || service.version || null,
                banner: service.banner || null,
                description: service.description || mapping.description || 'لا يوجد وصف إضافي من المصدر.',
                category: mapping.category || 'Other',
                confidence: String(service.confidence || mapping.confidence || 'medium').toLowerCase(),
            };
        }

        normalizeFinding(finding) {
            const severity = String(finding.severity || finding.risk || finding.risk_level || 'medium').toLowerCase();
            return {
                ip_address: finding.ip_address || finding.ip || null,
                port: this.toNumber(finding.port),
                type: finding.type || finding.cve || finding.name || 'finding',
                title: finding.title || finding.name || finding.type || finding.cve || 'ملاحظة أمنية',
                severity,
                confidence: String(finding.confidence || 'medium').toLowerCase(),
                description: finding.description || finding.output || finding.notes || 'لم يرفق المصدر وصفًا تفصيليًا.',
                recommendation: finding.recommendation || this.defaultRecommendation(severity),
                priority: finding.priority || this.toPriority(severity),
            };
        }

        normalizeTimeline(items) {
            return this.asArray(items).map((item) => ({
                stage: item.stage || item.name || item.label || 'مرحلة غير معروفة',
                status: item.status || 'نجاح',
                started_at: item.started_at || item.startedAt || item.at || item.time || null,
                finished_at: item.finished_at || item.finishedAt || item.at || item.time || null,
                duration_ms: this.toNumber(item.duration_ms ?? item.durationMs ?? item.duration),
                parsing_status: item.parsing_status || item.parsingStatus || null,
                note: item.note || null,
            }));
        }

        finalizeReport(base) {
            const dedupedPorts = this.deduplicatePorts(base.ports || []);
            const dedupedServices = this.deduplicateServices(base.services || []);
            const allFindings = this.deduplicateFindings([...(base.findings || []), ...this.deriveFindingsFromPorts(dedupedPorts)]);
            const hosts = (base.hosts || []).map((host) => ({
                ...host,
                port_count: host.port_count || dedupedPorts.filter((port) => port.ip_address === host.ip_address && port.state === 'open').length,
                vulnerability_count: host.vulnerability_count || allFindings.filter((finding) => finding.ip_address === host.ip_address).length,
            }));

            const groupedServices = {
                web: dedupedServices.filter((service) => service.category === 'Web Services'),
                remote: dedupedServices.filter((service) => service.category === 'Remote Access'),
                databases: dedupedServices.filter((service) => service.category === 'Databases'),
                sharing: dedupedServices.filter((service) => service.category === 'File Sharing'),
                infrastructure: dedupedServices.filter((service) => service.category === 'Infrastructure'),
                other: dedupedServices.filter((service) => service.category === 'Other'),
            };

            const metrics = this.calculateMetrics(hosts, dedupedPorts, allFindings, groupedServices);
            const securityAnalysis = this.buildSecurityAnalysis(dedupedPorts, allFindings, groupedServices);
            const timeline = this.normalizeTimeline(base.timeline || this.buildSyntheticTimeline(base.startedAt, base.finishedAt, {}));

            return {
                sourceType: base.sourceType,
                sourceName: base.sourceName,
                importedAt: new Date().toISOString(),
                targetValue: base.targetValue || 'غير متاح',
                targetType: base.targetType || 'غير متاح',
                executionMode: base.executionMode || 'imported',
                startedAt: base.startedAt || new Date().toISOString(),
                finishedAt: base.finishedAt || base.startedAt || new Date().toISOString(),
                hostStatus: base.hostStatus || hosts[0]?.status || 'unknown',
                hostname: base.hostname || hosts[0]?.hostname || null,
                reverseDns: base.reverseDns || hosts[0]?.reverse_dns || null,
                latencyMs: base.latencyMs ?? hosts[0]?.latency_ms ?? null,
                hosts,
                ports: this.sortPorts(dedupedPorts),
                services: dedupedServices,
                groupedServices,
                findings: allFindings,
                limitations: base.limitations || [],
                timeline,
                parsingErrors: base.parsingErrors || [],
                unavailableFields: base.unavailableFields || [],
                securityAnalysis,
                metrics,
            };
        }

        deriveFindingsFromPorts(ports) {
            return ports
                .filter((port) => port.state === 'open' && ['medium', 'high', 'critical'].includes(port.risk_level))
                .map((port) => ({
                    ip_address: port.ip_address,
                    port: port.port,
                    type: 'SERVICE_EXPOSURE',
                    title: `${port.service_label} مكشوفة`,
                    severity: port.risk_level,
                    confidence: port.confidence || 'medium',
                    description: port.risk_reason || port.description,
                    recommendation: port.recommendation || this.defaultRecommendation(port.risk_level),
                    priority: port.priority || this.toPriority(port.risk_level),
                }));
        }

        buildSecurityAnalysis(ports, findings, groupedServices) {
            const sensitivePorts = ports.filter((port) => port.state === 'open' && ['high', 'critical'].includes(port.risk_level));
            const remoteAccess = groupedServices.remote || [];
            const webExposure = groupedServices.web || [];
            const databases = groupedServices.databases || [];

            return {
                sensitivePorts: sensitivePorts.map((port) => ({
                    port: port.port,
                    protocol: port.protocol,
                    service: port.service_label,
                    severity: port.risk_level,
                    reason: port.risk_reason,
                    recommendation: port.recommendation,
                    priority: port.priority,
                })),
                legacyServices: ports
                    .filter((port) => ['ftp', 'telnet', 'netbios-ssn'].includes(String(port.service_name || '').toLowerCase()))
                    .map((port) => ({
                        service: port.service_label,
                        port: port.port,
                        reason: 'خدمة قديمة أو أقل ملاءمة للبيئات الحديثة وتحتاج مراجعة.',
                        priority: 'عالية',
                    })),
                exposureFlags: [
                    remoteAccess.length ? `تم رصد ${remoteAccess.length} خدمة وصول عن بعد.` : null,
                    webExposure.length ? `تم رصد ${webExposure.length} خدمة ويب.` : null,
                    databases.length ? `تم رصد ${databases.length} خدمة قواعد بيانات.` : null,
                ].filter(Boolean),
                recommendations: this.uniqueStrings([
                    ...sensitivePorts.map((port) => port.recommendation),
                    ...findings.map((finding) => finding.recommendation),
                ]).slice(0, 10),
            };
        }

        calculateMetrics(hosts, ports, findings, groupedServices) {
            const openPorts = ports.filter((port) => port.state === 'open').length;
            const closedPorts = ports.filter((port) => port.state === 'closed').length;
            const filteredPorts = ports.filter((port) => port.state === 'filtered').length;
            const alerts = findings.filter((finding) => ['high', 'critical'].includes(finding.severity)).length;
            const warnings = findings.filter((finding) => ['medium', 'low'].includes(finding.severity)).length;
            const uncertainItems = hosts.filter((host) => !host.hostname || !host.os_name || !host.mac_address).length +
                ports.filter((port) => !port.service_name || !port.service_version).length;
            const sensitiveServices = (groupedServices.remote?.length || 0) + (groupedServices.databases?.length || 0);
            const hasRemoteAccess = (groupedServices.remote?.length || 0) > 0;
            const hasWebExposure = (groupedServices.web?.length || 0) > 0;
            const hasDatabases = (groupedServices.databases?.length || 0) > 0;
            const highestRiskPort = this.sortPorts(ports.filter((port) => port.state === 'open'))[0] || null;
            const riskScore = this.calculateRiskScore(ports, findings);
            const securityScore = Math.max(0, 100 - riskScore);
            const confidenceScore = this.calculateConfidence(hosts, ports, findings);

            return {
                openPorts,
                closedPorts,
                filteredPorts,
                servicesDetected: new Set(ports.filter((port) => port.state === 'open').map((port) => `${port.port}:${port.service_label}`)).size,
                findingsCount: findings.length,
                alerts,
                warnings,
                uncertainItems,
                riskScore,
                securityScore,
                confidence: confidenceScore,
                riskLevel: this.riskLevelFromScore(riskScore),
                sensitiveServices,
                hasRemoteAccess,
                hasWebExposure,
                hasDatabases,
                highestRiskService: highestRiskPort ? `${highestRiskPort.service_label} (${highestRiskPort.port}/${highestRiskPort.protocol})` : 'غير متاح',
                liveHosts: hosts.filter((host) => host.status === 'up').length,
            };
        }

        buildSyntheticTimeline(startedAt, finishedAt, data) {
            const start = startedAt ? new Date(startedAt).getTime() : Date.now();
            const finish = finishedAt ? new Date(finishedAt).getTime() : start;
            const total = Math.max(finish - start, 1000);
            const stages = [
                'DNS Resolution',
                'Host Discovery',
                'Port Analysis',
                'Service Classification',
                'Security Analysis',
                'Report Generation',
            ];

            return stages.map((stage, index) => {
                const stageStart = new Date(start + Math.round((total / stages.length) * index)).toISOString();
                const stageFinish = new Date(start + Math.round((total / stages.length) * (index + 1))).toISOString();
                return {
                    stage,
                    status: stage === 'Security Analysis' && Array.isArray(data?.parserErrors) && data.parserErrors.length ? 'تحذير' : 'نجاح',
                    started_at: stageStart,
                    finished_at: stageFinish,
                    duration_ms: new Date(stageFinish).getTime() - new Date(stageStart).getTime(),
                    parsing_status: stage === 'Report Generation' ? (Array.isArray(data?.parserErrors) && data.parserErrors.length ? 'تحذير parsing' : 'سليم') : 'سليم',
                    note: null,
                };
            });
        }

        getServiceMapping(serviceName, portNumber) {
            const normalized = String(serviceName || '').toLowerCase();
            if (normalized) {
                for (const [, mapping] of this.serviceCatalog.entries()) {
                    if (normalized.includes(String(mapping.name).toLowerCase().replace(/[^a-z0-9]/g, ''))) {
                        return mapping;
                    }
                }
            }
            return this.serviceCatalog.get(portNumber) || {
                name: null,
                category: 'Other',
                confidence: 'low',
                risk: 'low',
                description: 'تعذر ربط المنفذ بخدمة معروفة من القاعدة الحالية.',
            };
        }

        buildRiskReason(mapping, state) {
            if (state !== 'open') {
                return 'المنفذ ليس مفتوحًا حاليًا، لذلك يظل الأثر الأمني أقل مباشرة.';
            }
            return mapping?.description || 'تم التصنيف وفق الخدمة المتوقعة والمنفذ المكشوف.';
        }

        buildPortRecommendation(serviceName, category, riskLevel) {
            const service = String(serviceName || '').toLowerCase();
            if (service === 'ssh') {
                return 'قيّد الوصول إلى SSH على مصادر موثوقة، واستخدم المفاتيح بدل كلمات المرور، وعطّل تسجيل الدخول المباشر قدر الإمكان.';
            }
            if (service === 'rdp') {
                return 'قيد RDP عبر VPN أو قوائم سماح، وفعّل MFA إن كانت البيئة تدعمه.';
            }
            if (category === 'Databases') {
                return 'لا تترك خدمات قواعد البيانات مكشوفة خارج النطاق المطلوب، وراجع الاعتمادات وسياسات الشبكة.';
            }
            if (category === 'Web Services') {
                return 'راجع التهيئة، وفعّل التشفير، وقلل الخدمات البديلة المكشوفة إن لم تكن مطلوبة.';
            }
            if (riskLevel === 'critical' || riskLevel === 'high') {
                return 'راجع سبب كشف الخدمة، وقلل التعرض، وطبّق ضوابط وصول وتحديثات أمنية مناسبة.';
            }
            return 'تحقق من الحاجة التشغيلية للخدمة، واحتفظ بها ضمن أقل تعرّض ممكن ووفق سياسة الشركة.';
        }

        calculateRiskScore(ports, findings) {
            let score = 0;
            for (const port of ports) {
                if (port.state !== 'open') continue;
                if (port.risk_level === 'critical') score += 18;
                else if (port.risk_level === 'high') score += 12;
                else if (port.risk_level === 'medium') score += 7;
                else score += 3;
            }
            for (const finding of findings) {
                if (finding.severity === 'critical') score += 20;
                else if (finding.severity === 'high') score += 14;
                else if (finding.severity === 'medium') score += 8;
                else score += 4;
            }
            return Math.min(100, score);
        }

        calculateConfidence(hosts, ports, findings) {
            let confidence = 45;
            if (hosts.some((host) => host.hostname)) confidence += 10;
            if (hosts.some((host) => host.os_name)) confidence += 10;
            if (ports.some((port) => port.service_name)) confidence += 12;
            if (ports.some((port) => port.service_version)) confidence += 8;
            if (ports.some((port) => port.banner)) confidence += 5;
            if (findings.length > 0) confidence += 5;
            return Math.min(100, confidence);
        }

        collectUnavailableFields(hosts, ports) {
            const unavailable = [];
            const firstHost = hosts[0] || {};
            if (!firstHost.hostname) unavailable.push('اسم المضيف غير متاح من المصدر.');
            if (!(firstHost.reverse_dns || firstHost.reverseDns)) unavailable.push('نتيجة Reverse DNS غير متاحة من المصدر.');
            if (!(firstHost.mac_address || firstHost.mac)) unavailable.push('عنوان MAC غير متاح من المصدر.');
            if (!firstHost.vendor) unavailable.push('اسم الشركة المصنعة غير متاح من المصدر.');
            if (!(firstHost.os_name || firstHost.os)) unavailable.push('نظام التشغيل غير متاح من المصدر.');
            if (!ports.some((port) => port.service_version || port.version)) unavailable.push('إصدارات الخدمات لم يتم إرجاعها من المصدر.');
            return unavailable;
        }

        deduplicatePorts(ports) {
            const map = new Map();
            for (const port of ports) {
                const key = `${port.ip_address || 'unknown'}:${port.protocol || 'tcp'}:${port.port || 0}`;
                map.set(key, { ...map.get(key), ...port });
            }
            return Array.from(map.values());
        }

        deduplicateServices(services) {
            const map = new Map();
            for (const service of services) {
                const key = `${service.ip_address || 'unknown'}:${service.port || 0}:${service.service_name || 'unknown'}`;
                map.set(key, { ...map.get(key), ...service });
            }
            return Array.from(map.values());
        }

        deduplicateFindings(findings) {
            const map = new Map();
            for (const finding of findings) {
                const key = `${finding.ip_address || 'unknown'}:${finding.port || 0}:${finding.title || finding.type || 'finding'}`;
                map.set(key, { ...map.get(key), ...finding });
            }
            return Array.from(map.values());
        }

        sortPorts(ports) {
            const rank = { critical: 4, high: 3, medium: 2, low: 1 };
            return [...ports].sort((a, b) => {
                const riskDiff = (rank[b.risk_level] || 0) - (rank[a.risk_level] || 0);
                if (riskDiff !== 0) return riskDiff;
                return (a.port || 0) - (b.port || 0);
            });
        }

        riskLevelFromScore(score) {
            if (score >= 75) return 'مرتفع';
            if (score >= 45) return 'متوسط';
            return 'منخفض';
        }

        toPriority(severity) {
            if (severity === 'critical' || severity === 'high') return 'عالية';
            if (severity === 'medium') return 'متوسطة';
            return 'منخفضة';
        }

        defaultRecommendation(severity) {
            if (severity === 'critical' || severity === 'high') {
                return 'راجع سبب التعرض فورًا، وقلل الوصول، وطبّق الضوابط والتحديثات الأمنية المطلوبة.';
            }
            if (severity === 'medium') {
                return 'تحقق من الحاجة التشغيلية للخدمة وراجع تقييد الوصول والتهيئة.';
            }
            return 'استمر في المراقبة الدورية واحتفظ بالخدمة ضمن سياسات التقوية المعتمدة.';
        }

        uniqueStrings(items) {
            return [...new Set(items.filter(Boolean))];
        }

        toNumber(value) {
            if (value === null || value === undefined || value === '') return null;
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : null;
        }

        asArray(value) {
            if (Array.isArray(value)) return value;
            if (value === null || value === undefined) return [];
            return [value];
        }
    }

    window.IPScanReportNormalizer = IPScanReportNormalizer;
})();
