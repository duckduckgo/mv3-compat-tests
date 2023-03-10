import { loadPageAndWaitForLoad } from "./utils.js";

const { expect } = chai;

describe("chrome.scripting.executeScript", () => {
  it("Returns an array of InjectionResult", async () => {
    const url = "https://privacy-test-pages.glitch.me/";
    const tab = await loadPageAndWaitForLoad(url)
    await new Promise(resolve => setTimeout(resolve, 500))
    const result = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      world: 'ISOLATED',
      func: () => {
        return document.location.href;
      },
    });
    chrome.tabs.remove(tab.id);
    expect(result).to.be.an("array");
    expect(result).to.have.lengthOf(1);
    const injectionResultProperties = ["documentId", "frameId", "result"];
    injectionResultProperties.forEach((prop) =>
      expect(result[0]).to.have.property(prop)
    );
    expect(result[0].frameId).to.equal(0);
    expect(result[0].result).to.equal(url);
  });
});
