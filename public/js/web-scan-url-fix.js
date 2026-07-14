// Fix for web scan URL validation
(function() {
    window.appLogger?.debug('Applying web scan URL validation fix...');
    
    function fixWebScanValidation() {
        const form = document.getElementById('web-scan-form');
        if (!form) return false;
        
        const urlInput = document.getElementById('scan-target-url');
        if (!urlInput) return false;
        
        // Add default URL for testing
        if (!urlInput.value || urlInput.value.trim() === '') {
            urlInput.value = 'https://example.com';
            window.appLogger?.debug('Default URL added for testing');
        }
        
        // Add validation
        urlInput.addEventListener('input', function() {
            const url = this.value.trim();
            const isValid = url.match(/^https?:\/\/.+/) || url.match(/^http?:\/\/.+/);
            
            if (!isValid && url !== '') {
                this.style.borderColor = '#ef4444';
                this.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
            } else {
                this.style.borderColor = '#10b981';
                this.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
            }
        });
        
        return true;
    }
    
    // Try to fix when page loads
    const tryFix = setInterval(() => {
        if (fixWebScanValidation()) {
            clearInterval(tryFix);
        }
    }, 100);
    
    // Also fix when modal opens
    document.addEventListener('click', (e) => {
        if (e.target.closest('[onclick*="showWebScanForm"]')) {
            setTimeout(() => {
                const tryFixModal = setInterval(() => {
                    if (fixWebScanValidation()) {
                        clearInterval(tryFixModal);
                    }
                }, 100);
            }, 500);
        }
    });
    
    window.appLogger?.debug('Web scan URL validation fix loaded');
})();
