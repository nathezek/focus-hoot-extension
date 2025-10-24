
/* What this file does:
     Scrapes video-title, channel-name & description metadata from youtube and logs the results.
 */

const DEBUG = true; // set false to quiet logs

function logDebug(...args) { if (DEBUG) console.log(...args); }

function getMetaData() {
    const titleEl = document.querySelector('ytd-watch-metadata h1.ytd-watch-metadata, ytd-watch-metadata[title-headline-xs] h1.ytd-watch-metadata, h1.title');
    const channelEl = document.querySelector('ytd-channel-name#channel-name a, yt-formatted-string[has-link-only_] a.yt-simple-endpoint.yt-formatted-string, ytd-channel-name a');
    // prefer expanded first
    const expanded = document.querySelector('#expanded.ytd-text-inline-expander');
    const snippet = document.querySelector('#snippet.ytd-text-inline-expander');
    const descEl = expanded || snippet;

    return {
        title: titleEl?.innerText?.trim() || null,
        channel: channelEl?.innerText?.trim() || null,
        description: descEl?.innerText?.trim() || '',
        url: location.href
    };
}

/* Try to click/dispatch events on the expand button multiple times until description is populated.
   Returns a Promise that resolves when description is non-empty, or rejects on timeout.
*/
function tryExpandDescription({ attempts = 6, interval = 500, timeout = 6000 } = {}) {
    return new Promise((resolve) => {
        const start = Date.now();
        let tries = 0;

        function doTry() {
            tries += 1;
            const expandBtn = document.querySelector('tp-yt-paper-button#expand, ytd-text-inline-expander tp-yt-paper-button#expand, tp-yt-paper-button[aria-label="Show more"], tp-yt-paper-button[aria-label="Show more"]');

            if (expandBtn) {
                // prefer native click, but also dispatch pointer events for robustness
                try {
                    expandBtn.click();
                    // Synthetic pointer events sometimes help when click() is ignored
                    const ev = new PointerEvent('pointerdown', { bubbles: true });
                    expandBtn.dispatchEvent(ev);
                    const ev2 = new PointerEvent('pointerup', { bubbles: true });
                    expandBtn.dispatchEvent(ev2);
                    logDebug('🟢 expandBtn clicked / dispatched events (try', tries + ')');
                } catch (e) {
                    logDebug('⚠️ expandBtn.click error', e);
                }
            } else {
                logDebug('ℹ️ expandBtn not found (try', tries + ')');
            }

            // check if expanded description has text
            const description = (document.querySelector('#expanded.ytd-text-inline-expander') || document.querySelector('#snippet.ytd-text-inline-expander'))?.innerText?.trim() || '';
            if (description.length > 0) {
                resolve({ ok: true, description });
                return;
            }

            // stop if we've elapsed timeout
            if (Date.now() - start > timeout) {
                logDebug('⏱ timeout reached while expanding description');
                resolve({ ok: false, description: '' });
                return;
            }

            // continue attempts if we haven't exceeded attempt count
            if (tries < attempts) {
                setTimeout(doTry, interval);
            } else {
                // attempts exhausted, continue trying until timeout but with longer intervals
                setTimeout(doTry, interval * 2);
            }
        }

        doTry();
    });
}

/* Observe until title+channel exist AND expanded description is available (or timeout).
   Will call callback(meta) once satisfied (meta.description prioritized from expanded).
*/
async function observeAndLog({ maxWait = 8000 } = {}) {
    // quick early return if already available
    let meta = getMetaData();
    if (meta.title && meta.channel && meta.description && meta.description.length > 0) {
        logMeta(meta);
        return;
    }

    // First: wait for title & channel to exist (they usually load before description)
    await new Promise((res) => {
        const shortObserver = new MutationObserver(() => {
            const now = getMetaData();
            if (now.title && now.channel) {
                shortObserver.disconnect();
                res();
            }
        });
        shortObserver.observe(document.body, { childList: true, subtree: true });
        // also give up after some time
        setTimeout(() => {
            shortObserver.disconnect();
            res();
        }, 3000);
    });

    // Once title & channel are present (or timeout), aggressively try to get expanded description
    const expandResult = await tryExpandDescription({ attempts: 8, interval: 400, timeout: Math.max(4000, maxWait) });
    meta = getMetaData();

    if (!expandResult.ok && (!meta.description || meta.description.length === 0)) {
        // Fallback: there is no expanded description yet. We'll keep a MutationObserver for a short extra while,
        // because sometimes the description appears as a mutation after other events.
        logDebug('ℹ️ fallback: continuing to observe for expanded description for 3s');
        await new Promise((res) => {
            const fallbackObserver = new MutationObserver(() => {
                const m = getMetaData();
                if (m.description && m.description.length > 0) {
                    fallbackObserver.disconnect();
                    res();
                }
            });
            fallbackObserver.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                fallbackObserver.disconnect();
                res();
            }, 3000);
        });
        meta = getMetaData();
    }

    // Final log (may be empty description if all attempts/timeouts failed)
    logMeta(meta);
}

function logMeta(meta) {
    console.clear();
    console.log('🎥 YouTube Video Metadata:');
    console.table(meta);
}

// Manage navigation: cancel previous observers implicitly by creating new runs
function handleNavigation() {
    // small delay so SPA has started patching DOM
    setTimeout(() => {
        observeAndLog({ maxWait: 7000 }).catch((e) => logDebug('observeAndLog error', e));
    }, 300); // tiny debounce so it doesn't fire immediately at first microtask
}

// initial run
handleNavigation();
// catch SPA internal navs
window.addEventListener('yt-navigate-finish', handleNavigation);

// popup message handler: return expanded description (async)
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'getMeta') {
        (async () => {
            // attempt expand and then reply with current metadata (wait up to 4s)
            await tryExpandDescription({ attempts: 6, interval: 400, timeout: 4000 });
            const meta = getMetaData();
            sendResponse(meta);
        })();
        return true; // indicates async response
    }
});

