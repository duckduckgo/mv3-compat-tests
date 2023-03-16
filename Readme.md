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

### Chrome 110

All tests pass here, as this is the reference implementation for these tests.

### Safari 16.3

Failures:
 - `chrome.scripting.executeScript`
    - 'Returns an array of InjectionResult': "expected null to be an object". This failure is due to this API not returning the result of `func`, the function passed to the script injection back to the background context. Instead, an array of `null` is returned.
 - `chrome.scripting.registerContentScripts`
    -  'Can register content-scripts at document_start': "chrome.scripting.registerContentScripts is not a function". This API is not yet implemented in Safari 16.3.
 - `chrome.declarativeNetRequest`
    - 'enabling static ruleset with anchor block rule blocks requests': Requests are not blocked after loading a simple static DNR ruleset.
    - 'requestDomains condition triggers on matched domains': Rules using the `requestDomains` condition are not supported.
    - 'allowAllRequests disables static blocking rules when document URL matches': The `allowAllRequests` rule does not disable blocking rules defined in a static ruleset.
    - 'allowAllRequests rules work when `removeRuleIds` is used in the same updateDynamicRules call'. When calling `updateDynamicRules` with both `removeRuleIds` and `addRules` options, this `allowAllRequests` rule does not get added.
    - 'modifyHeaders can add a Sec-GPC header': "Invalid call to declarativeNetRequest.updateDynamicRules(). Error with rule at index 0: Rule with id 5 is invalid. `modifyHeaders` is not a supported action type". `modifyHeaders` is not supported.
    - 'initiatorDomains' condition limits matches to requests initiated by matching domain: This option is only supported under the legacy 'domains' property.
    - 'domains' condition list matches initators' subdomains: Safari only matches exact domains in `domains` conditions.

### Safari Technology Preview 165

Failures:
 - `chrome.scripting.executeScript`
    - 'Returns an array of InjectionResult': "expected 'https://privacy-test-pages.glitch.me/' to be an object". This failure is due to the API returning a flat array of results of the function passed to the script injection, rather than an array if [InjectionResult](https://developer.chrome.com/docs/extensions/reference/scripting/#type-InjectionResult) as per the Chrome documentation.
 - `chrome.scripting.registerContentScripts`
    - 'Can register content-scripts at document_start': "expected 'document_idle' to equal 'document_start'". Content scripts registered with `runAt` as `document_start` are registered instead to run at `document_idle`.
    - 'Does not affect content-scripts declared in the manifest'. After registering a content script via this API, content scripts declared in the manifest `content_scripts` property are no longer run.
 - `chrome.declarativeNetRequest`
    - 'requestDomains condition triggers on matched domains': Rules using the `requestDomains` condition do not trigger.
    - 'allowAllRequests disables static blocking rules when document URL matches'. Same as in 16.3
    - 'allowAllRequests rules work when `removeRuleIds` is used in the same updateDynamicRules call'. Same as in 16.3
    - 'redirect to extension image url with anchored urlFilter'. Regression since 16.3. Rule redirecting to an extension image resource do not match.
    - 'redirect to extension image url with explicit urlFilter'. Regression since 16.3. Same as above.
    - 'redirect to extension script url with anchored urlFilter'. Regression since 16.3. Same as above, but with a script instead of image.
    - 'queryTransform can remove search parameters'. Regression since 16.3. `queryTransform` rules do not add or remove query parameters
    - 'queryTransform can add search parameters in main_frame requests'. Regression since 16.3. Same as above.
    - 'modifyHeaders can add a Sec-GPC header'. Same as in 16.3.
    - ''initiatorDomains' condition limits matches to requests initiated by matching domain'. Same as in 16.3.
    - ''domains' condition list matches initators' subdomains'. Same as in 16.3

### Firefox Nightly 112

Failures:
 - `chrome.scripting.registerContentScripts`: `world` property is not supported.
 - `chrome.declarativeNetRequest`: Most tests fail due to lack of support for `MAIN` world scripts, which we require to check test results in test pages.
