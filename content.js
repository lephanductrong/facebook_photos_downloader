let isScanning = false;
let scannedPhotos = new Set();
let noNewPhotosCount = 0;
const MAX_NO_NEW_SCROLLS = 8; // Increased scroll attempts since we depend on network
const SCROLL_DELAY = 1500; // Faster scroll since we don't need complex DOM parsing

// Inject the interceptor script
const injectScript = document.createElement('script');
injectScript.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement).appendChild(injectScript);

// Listen for messages from the injected script
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data.type && event.data.type === 'FB_PHOTOS_DOWNLOADER_URLS') {
        const urls = event.data.urls;
        let newCount = 0;
        urls.forEach(url => {
            if (!scannedPhotos.has(url)) {
                scannedPhotos.add(url);
                newCount++;
            }
        });

        if (isScanning && newCount > 0) {
            chrome.runtime.sendMessage({
                action: 'UPDATE_COUNT',
                count: scannedPhotos.size
            });
            // Reset no-new-photos counter if we found something
            noNewPhotosCount = 0;
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_SCROLL') {
        if (isScanning) return;
        isScanning = true;
        noNewPhotosCount = 0;
        scannedPhotos.clear();
        scanAndScroll();
        sendResponse({ status: 'STARTED' });
    } else if (request.action === 'STOP_AND_SHOW_URLS') {
        isScanning = false;
        const urlList = Array.from(scannedPhotos);
        sendResponse({ count: scannedPhotos.size, urls: urlList });
        // No download triggered here anymore
    } else if (request.action === 'GET_STATUS') {
        sendResponse({
            status: isScanning ? 'RUNNING' : 'STOPPED',
            count: scannedPhotos.size
        });
    }
});

function scanAndScroll() {
    if (!isScanning) return;

    // We rely on network interceptor.

    noNewPhotosCount++;

    if (noNewPhotosCount >= MAX_NO_NEW_SCROLLS) {
        console.log("No new high-res photos found for several scrolls. Stopping.");
        isScanning = false;
        // Don't auto-download or show alert, just stop.
        // The popup will poll or user will click Stop.
        // Since we don't have push-to-popup logic for stopping (except polling), 
        // the user will see it stop scrolling and click "Stop", getting the URLs then.
        alert("Finished scanning. Click 'Stop & Show URLs' in the extension to get the links.");
        return;
    }

    // Scroll
    window.scrollTo(0, document.body.scrollHeight);

    // Schedule next
    setTimeout(scanAndScroll, SCROLL_DELAY);
}
// startDownload function removed

