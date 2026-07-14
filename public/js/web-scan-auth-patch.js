// Patch to add web scan authorization to dropdown
(function() {
    window.appLogger?.debug('Applying web scan authorization patch...');
    
    // Function to add local authorization
    function addWebScanAuth() {
        const authSelect = document.getElementById('scan-authorization-id');
        if (!authSelect) {
            window.appLogger?.debug('Authorization select not found, retrying...');
            return false;
        }
        
        // Check if our auth already exists
        const existingOptions = Array.from(authSelect.options);
        const alreadyExists = existingOptions.some(option => option.value === 'web-scan-2024');
        
        if (!alreadyExists) {
            // Add our local authorization
            const option = document.createElement('option');
            option.value = 'web-scan-2024';
            option.textContent = 'منصة اختبار الاختراق - صالح حتى 2027-12-31';
            authSelect.appendChild(option);
            
                window.appLogger?.debug('Web scan authorization added to dropdown');
            
            // Set as selected if it's the only valid option
            if (existingOptions.length <= 1) {
                authSelect.value = 'web-scan-2024';
            }
        }
        
        return true;
    }
    
    // Try to add authorization when page loads
    const tryAddAuth = setInterval(() => {
        if (addWebScanAuth()) {
            clearInterval(tryAddAuth);
        }
    }, 100);
    
    // Also try when modal is opened
    document.addEventListener('click', (e) => {
        if (e.target.closest('[onclick*="showWebScanForm"]')) {
            setTimeout(() => {
                const tryAddAuthModal = setInterval(() => {
                    if (addWebScanAuth()) {
                        clearInterval(tryAddAuthModal);
                    }
                }, 100);
            }, 500);
        }
    });
    
    window.appLogger?.debug('Web scan authorization patch loaded');
})();
