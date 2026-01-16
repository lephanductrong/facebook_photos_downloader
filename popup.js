document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusText = document.getElementById('statusText');
    const countText = document.getElementById('countText');
    const downloadTxtBtn = document.getElementById('downloadTxtBtn');
    const urlListArea = document.getElementById('urlList');

    // Check if we are already running in the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_STATUS' }, (response) => {
                if (response && response.status === 'RUNNING') {
                    setRunningState(response.count);
                }
            });
        }
    });

    startBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;

            // Inject script if not already there (though manifest should handle it, we execute to be sure or trigger start)
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }, () => {
                if (chrome.runtime.lastError) {
                    statusText.textContent = "Error: " + chrome.runtime.lastError.message;
                    return;
                }

                chrome.tabs.sendMessage(tabId, { action: 'START_SCROLL' }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Script might not be ready yet
                        console.error(chrome.runtime.lastError);
                        return;
                    }
                    setRunningState(0);
                });
            });
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'STOP_AND_SHOW_URLS' }, (response) => {
                setStoppedState();
                if (response && response.urls) {
                    statusText.textContent = `Found ${response.urls.length} links.`;
                    urlListArea.value = response.urls.join('\n');
                    downloadTxtBtn.disabled = response.urls.length === 0;
                }
            });
        });
    });

    downloadTxtBtn.addEventListener('click', () => {
        const text = urlListArea.value;
        if (!text) return;

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
            url: url,
            filename: 'facebook_image_links.txt',
            saveAs: true
        }, () => {
            URL.revokeObjectURL(url);
        });
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'UPDATE_COUNT') {
            countText.textContent = `Photos found: ${request.count}`;
        }
    });

    function setRunningState(count) {
        statusText.textContent = "Scanning & Scrolling...";
        startBtn.disabled = true;
        stopBtn.disabled = false;
        downloadTxtBtn.disabled = true;
        urlListArea.value = '';
        if (count !== undefined) {
            countText.textContent = `Photos found: ${count}`;
        }
    }

    function setStoppedState() {
        statusText.textContent = "Stopped.";
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
});
