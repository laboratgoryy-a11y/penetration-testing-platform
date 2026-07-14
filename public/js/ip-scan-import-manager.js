(function () {
    function ensureImportControls() {
        const quickActions = document.querySelector('.quick-actions');
        if (!quickActions || document.getElementById('import-ip-scan-btn')) {
            return;
        }

        const button = document.createElement('button');
        button.className = 'btn-secondary';
        button.id = 'import-ip-scan-btn';
        button.innerHTML = '<i class="fas fa-file-import"></i> استيراد نتيجة معتمدة';

        const input = document.createElement('input');
        input.type = 'file';
        input.id = 'import-ip-scan-file';
        input.accept = '.json,.xml,.csv';
        input.style.display = 'none';

        button.addEventListener('click', () => input.click());
        input.addEventListener('change', async (event) => {
            const file = event.target.files?.[0];
            if (!file) {
                return;
            }

            try {
                if (!window.IPScanReportNormalizer) {
                    throw new Error('Normalizer is unavailable');
                }

                loadingManager.showGlobal('جاري استيراد التقرير المعتمد وتحويله إلى لوحة دفاعية...');
                const content = await file.text();
                const normalizer = new window.IPScanReportNormalizer();
                const report = normalizer.parseUploadedReport(file.name, content);
                const importKey = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
                sessionStorage.setItem(`ipScanImportedReport:${importKey}`, JSON.stringify(report));
                window.location.href = `/ip-scan-results.html?importKey=${encodeURIComponent(importKey)}`;
            } catch (error) {
                console.error('Import error:', error);
                notificationManager.show(
                    error instanceof Error ? error.message : 'فشل استيراد التقرير',
                    'error'
                );
            } finally {
                loadingManager.hideGlobal();
                input.value = '';
            }
        });

        quickActions.appendChild(button);
        quickActions.appendChild(input);
    }

    document.addEventListener('DOMContentLoaded', ensureImportControls);
})();
