/** global mocha, chai */
import { loadPageAndWaitForLoad } from './utils.js'
const { expect } = chai;

const testUrl =
  "https://bad.third-party.site/privacy-protections/request-blocking/block-me/script.js";

async function dnrTest(addRules, test) {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules,
    });
    await test();
  } finally {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: addRules.map((r) => r.id),
    });
  }
}

function getExecuteScriptResults(result) {
  return result.map((r) => (r?.documentId ? r.result : r));
}

async function runTestPageTest(testPageUrl, waitFor) {
  const tab = await loadPageAndWaitForLoad(testPageUrl)
  while (true) {
    const result = await getTestPageResults(tab.id);
    if (result && waitFor(result)) {
      await chrome.tabs.remove(tab.id);
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function getTestPageResults(tabId) {
  const result = await chrome.scripting.executeScript({
    target: {
      tabId,
    },
    world: "MAIN",
    func: () => {
      return results?.results;
    },
  });
  return getExecuteScriptResults(result)[0];
}

describe("chrome.declarativeNetRequest", () => {
  it("urlFilter with anchor blocks requests on matched domains", async () => {
    await dnrTest(
      [
        {
          id: 1,
          action: {
            type: "block",
          },
          condition: {
            urlFilter: "||bad.third-party.site/*",
          },
        },
      ],
      async () => {
        const result = await runTestPageTest(
          "https://privacy-test-pages.glitch.me/privacy-protections/request-blocking/?run",
          (results) =>
            results.find(
              (r) => r.id === "xmlhttprequest" && r.status !== "not loaded"
            )
        );
        console.log(result);
        expect(result[0].status).to.not.equal("loaded");
      }
    );
  });

  it("requestDomains blocks requests on matched domains", async () => {
    await dnrTest(
      [
        {
          id: 1,
          action: {
            type: "block",
          },
          condition: {
            requestDomains: ["bad.third-party.site"],
          },
        },
      ],
      async () => {
        const result = await runTestPageTest(
          "https://privacy-test-pages.glitch.me/privacy-protections/request-blocking/?run",
          (results) =>
            results.find(
              (r) => r.id === "xmlhttprequest" && r.status !== "not loaded"
            )
        );
        console.log(result);
        expect(
          result.find((r) => r.id === "xmlhttprequest").status
        ).to.not.equal("loaded");
      }
    );
  });
});

mocha.run();
