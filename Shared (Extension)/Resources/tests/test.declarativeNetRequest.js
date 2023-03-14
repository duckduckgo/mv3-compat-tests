/** global mocha, chai */
import { loadPageAndWaitForLoad } from "./utils.js";
const { expect } = chai;

const testUrl =
  "https://bad.third-party.site/privacy-protections/request-blocking/block-me/script.js";

async function dnrTest(addRules, test) {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      // removeRuleIds: addRules.map((r) => r.id),
      addRules,
    });
    await test();
  } finally {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: addRules.map((r) => r.id),
    });
  }
}

/**
 * Unwraps the result of a chrome.scripting.executeScript call to handle inconsistencies
 * between Chrome and Safari return types.
 * @param {*} result 
 * @returns 
 */
function getExecuteScriptResults(result) {
  return result.map((r) => (r?.documentId ? r.result : r));
}

async function runTestPageTest(testPageUrl, waitFor) {
  const tab = await loadPageAndWaitForLoad(testPageUrl);
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
  afterEach(async () => {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((r) => r.id),
    });
    const rulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: rulesets,
    });
  });

  it("urlFilter with anchor blocks requests on matched domains", async () => {
    await dnrTest(
      [
        {
          id: 1,
          priority: 1,
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
        expect(result[0].status).to.not.equal("loaded");
      }
    );
  });

  it("enabling static ruleset with anchor block rule blocks requests", async () => {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ["test_rules_blocking"],
    });
    await dnrTest([], async () => {
      const result = await runTestPageTest(
        "https://privacy-test-pages.glitch.me/privacy-protections/request-blocking/?run",
        (results) =>
          results.find(
            (r) => r.id === "xmlhttprequest" && r.status !== "not loaded"
          )
      );
      expect(result[0].status).to.not.equal("loaded");
    });
  });

  it("requestDomains blocks requests on matched domains", async () => {
    await dnrTest(
      [
        {
          id: 1,
          priority: 1,
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
        expect(
          result.find((r) => r.id === "xmlhttprequest").status
        ).to.not.equal("loaded");
      }
    );
  });

  it("allowAllRequests disables blocking rules when document URL matches", async () => {
    await dnrTest(
      [
        {
          id: 1,
          priority: 1,
          action: {
            type: "block",
          },
          condition: {
            urlFilter: "||bad.third-party.site/*",
          },
        },
        {
          id: 2,
          priority: 2,
          action: {
            type: "allowAllRequests",
          },
          condition: {
            urlFilter: "||privacy-test-pages.glitch.me/",
            resourceTypes: ["main_frame"],
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
        expect(result.find((r) => r.id === "xmlhttprequest").status).to.equal(
          "loaded"
        );
      }
    );
  });

  it("allowAllRequests disables static blocking rules when document URL matches", async () => {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ["test_rules_blocking"],
    });
    await dnrTest(
      [
        {
          id: 2,
          priority: 2,
          action: {
            type: "allowAllRequests",
          },
          condition: {
            urlFilter: "||privacy-test-pages.glitch.me/",
            resourceTypes: ["main_frame"],
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
        expect(result.find((r) => r.id === "xmlhttprequest").status).to.equal(
          "loaded"
        );
      }
    );
  });

  it("allowAllRequests rules work when `removeRuleIds` is used in the same updateDynamicRules call", async () => {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ["test_rules_blocking"],
    });
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [
        {
          id: 2,
          priority: 2,
          action: {
            type: "allowAllRequests",
          },
          condition: {
            urlFilter: "||privacy-test-pages.glitch.me/",
            resourceTypes: ["main_frame"],
          },
        },
      ],
    });
    const result = await runTestPageTest(
      "https://privacy-test-pages.glitch.me/privacy-protections/request-blocking/?run",
      (results) =>
        results.find(
          (r) => r.id === "xmlhttprequest" && r.status !== "not loaded"
        )
    );
    expect(result.find((r) => r.id === "xmlhttprequest").status).to.equal(
      "loaded"
    );
  });

  it("redirect to extension image url with anchored urlFilter", async () => {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: 3,
          priority: 2,
          action: {
            type: "redirect",
            redirect: {
              extensionPath: "/images/icon-48.png",
            },
          },
          condition: {
            urlFilter: "||facebook.com/tr",
          },
        },
      ],
    });
    const tab = await loadPageAndWaitForLoad(
      "https://privacy-test-pages.glitch.me/tracker-reporting/1major-via-img.html"
    );
    const imgWidthResult = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      func: () => {
        return document.querySelector("img").width;
      },
    });
    chrome.tabs.remove(tab.id);
    // if image is 48px then our replacement image was loaded
    expect(getExecuteScriptResults(imgWidthResult)[0]).to.equal(48);
  });

  it("redirect to extension image url with explicit urlFilter", async () => {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: 3,
          priority: 2,
          action: {
            type: "redirect",
            redirect: {
              extensionPath: "/images/icon-48.png",
            },
          },
          condition: {
            urlFilter: "https://facebook.com/tr",
          },
        },
      ],
    });
    const tab = await loadPageAndWaitForLoad(
      "https://privacy-test-pages.glitch.me/tracker-reporting/1major-via-img.html"
    );
    const imgWidthResult = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      func: () => {
        return document.querySelector("img").width;
      },
    });
    chrome.tabs.remove(tab.id);
    // if image is 48px then our replacement image was loaded
    expect(getExecuteScriptResults(imgWidthResult)[0]).to.equal(48);
  });

  it("redirect to extension script url with anchored urlFilter", async () => {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: 4,
          priority: 2,
          action: {
            type: "redirect",
            redirect: {
              extensionPath: "/surrogate.js",
            },
          },
          condition: {
            urlFilter: "||doubleclick.net/instream/ad_status.js",
          },
        },
      ],
    });
    const tab = await loadPageAndWaitForLoad(
      "https://privacy-test-pages.glitch.me/tracker-reporting/1major-with-surrogate.html"
    );
    const surrogateScriptTest = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      injectImmediately: false,
      world: "MAIN",
      func: () => {
        return window.surrogate_test;
      },
    });
    chrome.tabs.remove(tab.id);
    expect(getExecuteScriptResults(surrogateScriptTest)[0]).to.equal("success");
  });

  it("queryTransform can remove search parameters", async () => {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: 5,
          priority: 2,
          action: {
            type: "redirect",
            redirect: {
              transform: {
                queryTransform: {
                  removeParams: ["fbclid"],
                },
              },
            },
          },
          condition: {
            resourceTypes: ["main_frame"],
            urlFilter: "||privacy-test-pages.glitch.me/*",
          },
        },
      ],
    });
    const tab = await loadPageAndWaitForLoad(
      "https://privacy-test-pages.glitch.me/privacy-protections/query-parameters/query.html?fbclid=12345&fb_source=someting&u=14"
    );
    const url = new URL((await chrome.tabs.get(tab.id)).url);
    chrome.tabs.remove(tab.id);
    expect(url.search).to.not.contain("fbclid");
  });

  it("modifyHeaders can add a Sec-GPC header", async () => {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: 5,
          priority: 6,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              { header: "Sec-GPC", operation: "set", value: "1" },
            ],
          },
          condition: {
            urlFilter: "||global-privacy-control.glitch.me/",
            resourceTypes: ["main_frame", "sub_frame"]
          },
        },
      ],
    });
    const tab = await loadPageAndWaitForLoad(
      "https://global-privacy-control.glitch.me/"
    );
    const gpcTest = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      injectImmediately: false,
      func: () => {
        return document.querySelector('.gpc-value > code').innerText
      },
    });
    chrome.tabs.remove(tab.id);
    expect(getExecuteScriptResults(gpcTest)[0]).to.equal('Sec-GPC: "1"');
  });
});
