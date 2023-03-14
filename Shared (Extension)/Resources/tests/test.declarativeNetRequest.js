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
      removeRuleIds: [2],
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
});

mocha.run();
