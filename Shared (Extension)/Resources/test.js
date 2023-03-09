/** global mocha, chai */

mocha.setup("bdd");

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

mocha.run();
