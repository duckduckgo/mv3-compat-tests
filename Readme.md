# Manifest V3 Compatibility Tests

This project is a self-contained Manifest V3 (MV3) Webextension that tests the extension APIs available
in supported browsers against some expectations of how these APIs should behave. These expectations are
largely based on the current [Chrome Extension API Documentation](https://developer.chrome.com/docs/extensions/reference/),
and the current defacto standard implementation in Chrome.

The purpose of this project is to document API differences across browsers, both for other extension developers,
and to encourage convergence to consistent and compatbility Webextension API implementations.

## Try it out

You can load this extension in MV3 compatible browsers as follows:

### Chrome (and other Chrome-based browsers)

 1. Open `chrome://extensions/`.
 2. Toggle 'Developer mode' in the top right corner.
 3. Click 'Load unpacked', navigate to the `mv3-compat-tests/Shared (Extension)/Resources/` folder, and chose select.
 4. The tests should automatically open and start running. The test page can also be re-opened by clicking the extension's action icon.

### Safari

 1. Open `mv3-compat-tests.xcodeproj` in Xcode.
 2. Run `mv3-compat-tests (macOS)` target.
 3. Go to Safari settings -> Extensions and enable `mv3-compat-tests`.
 4. Click `Edit Websites...` and grant permissions for all websites to the extension.
 5. If the tests don't open automatically, click the extension's action icon to start them.

### Firefox

 1. Edit `manifest.json`, adding `"scripts": ["background.js"]` underneath the `service_worker` line.
 2. Navigate to `about:debugging`
 3. Click 'Load Temporary Add-on...' and navigate to the `mv3-compat-tests/Shared (Extension)/Resources/` folder and select `manifest.json`.
 4. Go to `about:addons`, find 'mv3-compat-tests', click on the '...' menu and select 'Manage'.
 5. Go to the 'Permissions' tab and check 'Access your data for all websites' under Optional permissions.
 6. Go back to `about:debugging` and click the 'Manifest URL' link. On that page, change the path to `test.html`.

## Test status

The tests currently cover parts of the `scripting` and `declarativeNetRequest` APIs that are relevant to the 
[duckduckgo-privacy-extension](https://github.com/duckduckgo/duckduckgo-privacy-extension). The purpose is
to surface issues we've found testing MV3 APIs across platforms.

## Results

Current status table (only failing tests shown):

| Test | Chrome 110 | Safari 17.1 | Safari Tech Preview 183 | Firefox Nightly 122 |
| --- | --- | --- | --- |
| `scripting.executeScript`: Returns an array of InjectionResult | ✅ | ✅ (fixed in Safari 17)[^1] | ✅ | ❌ |
| `.scripting.registerContentScripts`: Can register content-scripts at document_start | ✅ | ✅ (fixed in Safari 17)[^2] | ✅ | ❌ |
| `declarativeNetRequest`: requestDomains condition triggers on matched domains |  ✅ | ❌[^3] | ❌ | ❌ |
| `declarativeNetRequest`: allowAllRequests disables static blocking rules when document URL matches |  ✅ | ❌[^4]| ✅ | ❌ |
| `declarativeNetRequest`: allowAllRequests rules work when `removeRuleIds` is used in the same updateDynamicRules call |  ✅ | ❌[^5] | ✅ | ❌ |
| `declarativeNetRequest`: redirect to extension image url with anchored urlFilter |  ✅ | ❌ | ✅ | ❌ |
| `declarativeNetRequest`: queryTransform can add search parameters in main_frame requests |  ✅ | ❌ | ❌ | ❌ |
| `declarativeNetRequest`: modifyHeaders can add a Sec-GPC header |  ✅ | ❌[^6] | ❌ | ❌ |
| `declarativeNetRequest`: 'initiatorDomains' condition limits matches to requests initiated by matching domain |  ✅ | ❌[^7] | ❌ | ❌ |
| `declarativeNetRequest`: 'initiatorDomains' condition list matches initators' subdomains |  ✅ | ❌[^8] | ❌ | ❌ |
| `declarativeNetRequest`: 'domains' condition list matches initators' subdomains |  ✅ | ❌[^8] | ✅ | ❌ |
| `declarativeNetRequest`: redirect supports regexSubstitution |  ✅ | ❌ | ❌ | ❌ |

 [^1]: This failure is due to this API not returning the result of `func`, the function passed to the script injection back to the background context. Instead, an array of `null` is returned.
 [^2]: "chrome.scripting.registerContentScripts is not a function". This API is not yet implemented in Safari 16.3.
 [^3]: Rules using the `requestDomains` condition are not supported.
 [^4]: The `allowAllRequests` rule does not disable blocking rules defined in a static ruleset.
 [^5]: When calling `updateDynamicRules` with both `removeRuleIds` and `addRules` options, this `allowAllRequests` rule does not get added.
 [^6]: Invalid call to declarativeNetRequest.updateDynamicRules(). Error with rule at index 0: Rule with id 5 is invalid. `modifyHeaders` is not a supported action type". `modifyHeaders` is not supported.
 [^7]: This option is only supported under the legacy 'domains' property.
 [^8]: Safari only matches exact domains in `domains` conditions. Subdomain matches require a `*` prefix on the domain.
 
### Firefox Nightly 112

Failures:
 - `chrome.scripting.registerContentScripts`: `world` property is not supported.
 - `chrome.declarativeNetRequest`: Most tests fail due to lack of support for `MAIN` world scripts, which we require to check test results in test pages.
