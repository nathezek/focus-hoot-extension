
export function sendMessage(type, data = {}) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type, data }, resolve);
    });
}
export function onMessage(type, callback) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === type) {
            callback(msg.data, sender, sendResponse);
            return true;
        }
    });
}
