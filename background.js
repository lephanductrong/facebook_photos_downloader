chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'DOWNLOAD_IMAGES') {
        const urls = request.urls;
        const folder = request.folder || 'facebook_photos';

        // Sanitize folder name
        const safeFolder = folder.replace(/[^a-zA-Z0-9_\-]/g, '_');

        console.log(`Received ${urls.length} images to download to ${safeFolder}.`);

        let started = 0;

        urls.forEach((url, index) => {
            // Small delay to prevent freezing/rate limits
            setTimeout(() => {
                const filename = `${safeFolder}/facebook_download_${Date.now()}_${index}.jpg`;

                chrome.downloads.download({
                    url: url,
                    filename: filename,
                    conflictAction: 'uniquify'
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Download failed for ${url}:`, chrome.runtime.lastError);
                    }
                });
            }, index * 200); // 200ms delay between downloads
        });

        sendResponse({ success: true, count: urls.length });
    }
});
