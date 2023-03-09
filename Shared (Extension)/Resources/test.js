/** global mocha, chai */

const { expect } = chai;
mocha.setup('bdd');
mocha.timeout(10000);

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
  let tab;
  const tabReady = new Promise((resolve) => {
    const onUpdated = (details) => {
      if (details.tabId === tab.id && details.frameId === 0) {
        resolve();
        chrome.tabs.onUpdated.removeListener(onUpdated);
      }
    };
    chrome.webNavigation.onDOMContentLoaded.addListener(onUpdated);
  });
  tab = await chrome.tabs.create({ url: testPageUrl, active: false });
  await tabReady;
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

describe("API scopes", () => {
  it("chrome is present in extension pages", () => {
    chai.expect(typeof chrome).to.equal("object");
  });

  const apis = ["tabs", "declarativeNetRequest"];

  apis.forEach((api) => {
    it(`chrome.${api} is present on extension pages`, () => {
      chai.expect(typeof chrome[api]).to.equal("object");
    });
  });
});

describe("chrome.declarativeNetRequest", () => {

  it("can block requests", async () => {
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

  it("supports requestDomains option", async () => {
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
        expect(result[0].status).to.not.equal("loaded");
      }
    );
  });
});

mocha.run();
