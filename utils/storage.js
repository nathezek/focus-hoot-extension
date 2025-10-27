
export async function setData(key, value) {
    await chrome.storage.sync.set({ [key]: value });
}
export async function getData(key) {
    const result = await chrome.storage.sync.get(key);
    return result[key];
}
