export const SUPPORTED_WIRELESS_TEST_TYPES = ['TRAFFIC_ANALYSIS'] as const;

export const WIRELESS_TEST_TYPE_CATALOG = [
  {
    id: 'TRAFFIC_ANALYSIS',
    label: 'تحليل المرور اللاسلكي',
    description: 'رصد سلبي للشبكة، تصنيف الحماية، والتحقق من المؤشرات الظاهرة.',
  },
  {
    id: 'WPA_HANDSHAKE_CAPTURE',
    label: 'التقاط WPA Handshake',
    description: 'يتطلب runner مخصصًا وأدوات لاسلكية هجومية مصرحًا بها.',
  },
  {
    id: 'DEAUTH_ATTACK',
    label: 'اختبار Deauthentication',
    description: 'اختبار هجومي لا يتاح إلا في بيئات مرخصة ومشغلات متخصصة.',
  },
  {
    id: 'WEP_CRACK',
    label: 'اختبار كسر WEP',
    description: 'اختبار هجومي قديم لا يتاح في هذا التشغيل الحالي.',
  },
  {
    id: 'EVIL_TWIN',
    label: 'اختبار Evil Twin',
    description: 'سيناريو هجومي متقدم يحتاج بنية تشغيل منفصلة وموافقات إضافية.',
  },
] as const;

export interface WirelessRuntimeTestReadiness {
  id: string;
  label: string;
  description: string;
  supported: boolean;
  reason: string;
  requiredCapabilities: string[];
  requiredTools: string[];
  recommendedPlatform?: 'linux' | 'windows' | 'macos' | 'any';
}

export type SupportedWirelessTestType =
  (typeof SUPPORTED_WIRELESS_TEST_TYPES)[number];

export type KnownWirelessTestType =
  (typeof WIRELESS_TEST_TYPE_CATALOG)[number]['id'];

export function normalizeWirelessTestTypes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
}

export function findUnsupportedWirelessTestTypes(requestedTestTypes: string[]): string[] {
  return requestedTestTypes.filter(
    (testType) =>
      !SUPPORTED_WIRELESS_TEST_TYPES.includes(
        testType as SupportedWirelessTestType
      )
  );
}

export function findUnknownWirelessTestTypes(requestedTestTypes: string[]): string[] {
  const knownTypes = new Set(
    WIRELESS_TEST_TYPE_CATALOG.map((testType) => testType.id)
  );

  return requestedTestTypes.filter((testType) => !knownTypes.has(testType as KnownWirelessTestType));
}

export function buildWirelessRuntimeReadiness(input: {
  platform: NodeJS.Platform;
  tools: string[];
  capabilities: string[];
}): WirelessRuntimeTestReadiness[] {
  const tools = new Set(input.tools);
  const capabilities = new Set(input.capabilities);
  const isLinux = input.platform === 'linux';
  const hasPassiveSupport =
    capabilities.has('WIRELESS_ASSESSMENT') &&
    (tools.has('nmcli') || tools.has('netsh-wlan'));
  const base = (definition: (typeof WIRELESS_TEST_TYPE_CATALOG)[number]) => ({
    id: definition.id,
    label: definition.label,
    description: definition.description,
  });

  return WIRELESS_TEST_TYPE_CATALOG.map((definition) => {
    switch (definition.id) {
      case 'TRAFFIC_ANALYSIS':
        return {
          ...base(definition),
          supported: hasPassiveSupport,
          reason: hasPassiveSupport
            ? 'جاهز للتنفيذ عبر أدوات الرصد اللاسلكي المتاحة على هذا الـ runner.'
            : 'يتطلب أداة رصد لاسلكي متاحة مثل nmcli أو netsh-wlan مع قدرة WIRELESS_ASSESSMENT.',
          requiredCapabilities: ['WIRELESS_ASSESSMENT'],
          requiredTools: ['nmcli أو netsh-wlan'],
          recommendedPlatform: 'any',
        };
      case 'WPA_HANDSHAKE_CAPTURE':
        return {
          ...base(definition),
          supported: false,
          reason: isLinux
            ? 'غير مفعّل في هذا النظام حاليًا. يحتاج runner لاسلكي مخصص مع monitor mode وأدوات التحقق الميداني.'
            : 'يفضل تشغيله على Linux مع بطاقة تدعم monitor mode وrunner ميداني مخصص.',
          requiredCapabilities: ['WIRELESS_ASSESSMENT', 'WIRELESS_MONITOR_MODE'],
          requiredTools: ['airodump-ng أو hcxdumptool'],
          recommendedPlatform: 'linux',
        };
      case 'DEAUTH_ATTACK':
        return {
          ...base(definition),
          supported: false,
          reason: 'غير مفعّل هنا. هذا النوع يحتاج runner هجومي مخصص، رقابة تشغيل، وموافقات تنفيذ إضافية.',
          requiredCapabilities: ['WIRELESS_ASSESSMENT', 'WIRELESS_MONITOR_MODE', 'WIRELESS_ACTIVE_TESTS'],
          requiredTools: ['aireplay-ng أو mdk4'],
          recommendedPlatform: 'linux',
        };
      case 'WEP_CRACK':
        return {
          ...base(definition),
          supported: false,
          reason: 'غير مفعّل في هذا التشغيل الحالي، ويتطلب أدوات متخصصة وبيئة تنفيذ منفصلة ومراجعة امتثال.',
          requiredCapabilities: ['WIRELESS_ASSESSMENT', 'WIRELESS_MONITOR_MODE', 'WIRELESS_ACTIVE_TESTS'],
          requiredTools: ['aircrack-ng', 'airodump-ng'],
          recommendedPlatform: 'linux',
        };
      case 'EVIL_TWIN':
        return {
          ...base(definition),
          supported: false,
          reason: 'غير مفعّل حاليًا. يحتاج runner هجومي وبنية Access Point وهمية وتشغيلًا معزولًا ومراقبًا.',
          requiredCapabilities: ['WIRELESS_ASSESSMENT', 'WIRELESS_ACTIVE_TESTS', 'WIRELESS_AP_EMULATION'],
          requiredTools: ['hostapd-wpe أو hostapd', 'dnsmasq'],
          recommendedPlatform: 'linux',
        };
      default:
        return {
          ...base(definition),
          supported: false,
          reason: 'غير متاح في هذا التشغيل الحالي.',
          requiredCapabilities: [],
          requiredTools: [],
          recommendedPlatform: 'any',
        };
    }
  });
}
