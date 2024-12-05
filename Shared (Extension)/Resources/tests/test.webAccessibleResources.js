import { loadPageAndWaitForLoad } from "./utils.js";
const { expect } = chai;

describe("web_accessible_resources", () => {
  it("script can be loaded by a webpage", async () => {
    const tab = await loadPageAndWaitForLoad(
      "https://privacy-test-pages.glitch.me/"
    );
    // inject the script tag
    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      world: "ISOLATED",
      func: () => {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("/surrogate.js");
        (document.head || document.documentElement).appendChild(script);
      },
    });
    await new Promise(resolve => setTimeout(resolve, 10))
    // read script value out from main world
    const result = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      world: "MAIN",
      func: () => window.surrogate_test,
    });
    // chrome.tabs.remove(tab.id);
    expect(result[0].result).to.equal("success");
  });

  it("script cannot be loaded by a webpage not declared in manifest", async () => {
    const tab = await loadPageAndWaitForLoad(
      "https://example.com/"
    );
    // inject the script tag
    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      world: "ISOLATED",
      func: () => {
        const script = document.createElement("script");
        script.src = chrome.runtime.getURL("/surrogate.js");
        (document.head || document.documentElement).appendChild(script);
      },
    });
    await new Promise(resolve => setTimeout(resolve, 10))
    // read script value out from main world
    const result = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      world: "MAIN",
      func: () => window.surrogate_test,
    });
    await chrome.tabs.remove(tab.id);
    expect(result[0].result).to.equal(null);
  });
});
