// inject.js
(function() {
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;
    const ORIGINAL_FETCH = window.fetch;

    // Helper to check for high-res URLs
    // We look for URLs that contain 'oh=' (security signature) and do NOT contain 'stp=' (scaling/cropping)
    function checkAndPostUrls(text) {
        if (!text || typeof text !== 'string') return;

        // Regex to find potential FB image URLs
        // Pattern matches strings starting with https:// and containing fbcdn.net
        // We look for the entire URL string up to a quote or whitespace
        const urlRegex = /https:\/\/[^"'\s]+\.fbcdn\.net\/[^"'\s]+/g;
        const matches = text.match(urlRegex);

        if (matches) {
            const validUrls = matches.filter(url => {
                // Decode to handle escaped characters like \/
                let cleanUrl = url.replace(/\\\//g, '/');
                
                // Criteria for full size:
                // 1. Has 'oh=' (signature)
                // 2. Does NOT have 'stp=' (which indicates resizing/smart transport protocol)
                // 3. Does NOT have 'p{width}x{height}' pattern often used for thumbnails (e.g. p526x296)
                // 4. Does NOT have 's{width}x{height}' pattern (e.g. s552x414)
                return cleanUrl.includes('oh=') && 
                       !cleanUrl.includes('stp=') && 
                       !/\/p\d+x\d+\//.test(cleanUrl) && 
                       !/\/s\d+x\d+\//.test(cleanUrl);
            }).map(url => url.replace(/\\\//g, '/')); // Return clean URLs

            if (validUrls.length > 0) {
                window.postMessage({
                    type: 'FB_PHOTOS_DOWNLOADER_URLS',
                    urls: [...new Set(validUrls)] // limit duplicates in one batch
                }, '*');
            }
        }
    }

    // Intercept XHR
    XHR.send = function(postData) {
        this.addEventListener('load', function() {
            // Only check text/json responses
            const contentType = this.getResponseHeader('content-type');
            if (contentType && (contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript'))) {
                checkAndPostUrls(this.responseText);
            }
        });
        return send.apply(this, arguments);
    };

    // Intercept Fetch
    window.fetch = async function(...args) {
        const response = await ORIGINAL_FETCH.apply(this, args);
        
        const clone = response.clone();
        clone.text().then(text => {
            checkAndPostUrls(text);
        }).catch(err => {
            // Ignore errors reading stream
        });

        return response;
    };

    // Also scan the initial page content for pre-loaded data
    setTimeout(() => {
         checkAndPostUrls(document.body.innerHTML);
    }, 2000);

    console.log('[FB Downloader] Network interceptor active.');
})();
