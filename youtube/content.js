
/* What this file does:
     Scrapes video-title, channel-name & description metadata from youtube and logs the results.
 */

function getMetaData() {
    const titleEl = document.querySelector('ytd-watch-metadata h1.ytd-watch-metadata');
    const channelEl = document.querySelector('ytd-channel-name#channel-name a');
    const descEl = document.querySelector('#snippet.ytd-text-inline-expander, #expanded.ytd-text-inline-expander');

    return {
        title: titleEl?.innerText?.trim() || null,
        channel: channelEl?.innerText?.trim() || null,
        description: descEl?.innerText?.trim() || '',
        url: location.href,
    };
}

// Observe the DOM until title and channel are ready
function observeUntilReady(callback) {
    const observer = new MutationObserver(() => {
        const meta = getMetaData();
        const titleReady = meta.title && meta.title.length > 0;
        const channelReady = meta.channel && meta.channel.length > 0;

        if (titleReady && channelReady) {
            observer.disconnect();
            // Give YouTube a short moment to finalize rendering
            setTimeout(() => callback(meta), 500);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function logMetaData(meta) {
    console.clear();
    console.log('🎥 YouTube Video Metadata:');
    console.table(meta);
}

// Wait for YouTube SPA navigation
function handleNavigation() {
    observeUntilReady(logMetaData);
}

// Run observer on first page load
handleNavigation();

// And re-run when user switches videos
window.addEventListener('yt-navigate-finish', () => {
    handleNavigation();
});

// Handle popup requests
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'getMeta') {
        const meta = getMetaData();
        sendResponse(meta);
    }
});

