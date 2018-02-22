var chrome = require('selenium-webdriver/chrome'),
	firefox = require('selenium-webdriver/firefox'),
    webdriver = require('selenium-webdriver'),
    test = require('selenium-webdriver/testing'),
    assert = require('selenium-webdriver/testing/assert'),
    until = require('selenium-webdriver/lib/until'),
    logger = require('selenium-webdriver/lib/logging'),
    rewire = require('rewire'),
    fs = require('fs'),
	localStorage = require('localStorage');

var wd;

function getExtensionName() {
    const manifestFile = 'keepassxc-browser/manifest.json'
    const manifest = JSON.parse(fs.readFileSync(manifestFile).toString());
    return(manifest['name']);
}

function getExtensionID(callback) {
    const extensionName = getExtensionName();
    var extensionIndex = null;
    var devToggle = {id: 'dev-toggle'};

    wd.get('chrome://extensions');
    wd.wait(until.elementLocated(devToggle), 2000).then(function() {
        wd.actions().click(wd.findElement(devToggle)).perform().then(function() {
            wd.findElements({className: 'extension-details'}).then(function(details) {
                for (detail of details) {
                    var extensionID;
                    detail.findElement({className: 'extension-id'}).then(function(id) {
                        id.getText().then(function(res) {
                            extensionID = res;
                        });
                    });

                    detail.findElement({className: 'extension-title'}).then(function(title) {
                        title.getText().then(function(val) {
                            if (val === extensionName) {
                                callback(extensionID);
                            }
                        });
                    });
                }
            });
        });
    });
}

test.before(function(done) {
	var chromeOptions = new chrome.Options().addArguments("load-extension=keepassxc-browser/");
	var firefoxOptions = new firefox.Options();	// None set yet. Use only chrome for now.

	wd = new webdriver.Builder()
		.forBrowser('chrome')
		.setChromeOptions(chromeOptions)
		.setFirefoxOptions(firefoxOptions)
		.build();

    // Build URL's based on the extension ID
    getExtensionID(function(id) {
        console.log('Extension ID: ' + id);
        BASE_URL = 'chrome-extension://' + id + '/';
        OPTIONS_URL = BASE_URL + 'options/options.html';
        POPUP_URL = BASE_URL + 'popups/popup.html';
        done();
    });
});

test.after(function() {
	wd.quit();
});

// Test popup visibility and reload button functionality
test.describe('Testing popup', function() {
	test.it('Test popup error message', function() {
		wd.get(POPUP_URL);

		wd.findElement({id: 'error-encountered'}).then(function(popup) {
			new assert.Assertion(popup.isDisplayed(), 'Popup is displayed');
		});

		wd.findElement({id: 'error-message'}).getText().then(function(text) {
			new assert.Assertion(text).equals('Timeout or not connected to KeePassXC', 'Error message is correct');
		});
	});

	// Connecting to native messaging host org.keepassxc.keepassxc_browser (keepass.js:870)
	test.it('Test reload button', function() {
		wd.get(POPUP_URL);

		wd.findElement({id: 'reload-status-button'}).then(function(reloadButton) {
			new assert.Assertion(reloadButton.isDisplayed(), 'Reload button is displayed');

			wd.actions().click(reloadButton).perform().then(function() {
				// Check here that the functionality actually does something

			});
		});
	});
});

// This test is disabled because AFAIK there's no way to get localStorage of an extension
// Test options page and check the settings are enabled/disabled in localStorage
/*test.describe('Testing options page', function() {
	test.it('Read default settings', function() {
		wd.get(OPTIONS_URL);

		var checkOptions = [
			'checkUpdateKeePassXC',
			'autoCompleteUsernames',
			'autoFillAndSend',
			'usePasswordGenerator',
			'autoFillSingleEntry',
			'autoRetrieveCredentials'
			'showNotifications'
		];

		var numberOptions = [
			'blinkTimeout',
			'blinkMinTimeout',
			'allowedRedirect'
		];

		checkOptions.forEach(function(option) {
			var defaultOption = localStorage[option];

			wd.actions().click(wd.findElement({name: option})).perform().then(function() {
				console.log(localStorage[option] + ' - ' + defaultOption);
				new assert.Assertion(localStorage[option] !== defaultOption, "Option test: " + option);
				wd.actions().click(wd.findElement({name: option})).perform().then(function() {
					console.log(localStorage[option] + ' - ' + defaultOption);
					new assert.Assertion(localStorage[option] === defaultOption, "Option test: " + option);
				});
			});
		});

		numberOptions.forEach(function(option) {
			var defaultOption = localStorage[option];
			console.log(defaultOption);
			var buttonName = option + 'Button';

			var numberField = wd.findElement({id: option});
			numberField.sendKeys('2').then(function() {
				wd.actions().click(wd.findElement({id: buttonName})).perform().then(function() {
					console.log(localStorage[option] + ' - ' + defaultOption);
					new assert.Assertion(localStorage[option] !== defaultOption, "Option test: " + option);
					wd.actions().click(wd.findElement({id: buttonName})).perform().then(function() {
						console.log(localStorage[option] + ' - ' + defaultOption);
						new assert.Assertion(localStorage[option] === defaultOption, "Option test: " + option);
					});
				});
			});
		});
	});
});*/


// Test external URL's and check that input fields are found and the password generator icon is visible
// This site could also be internal and included in the test folder.
test.describe('Testing external sites', function() {
	test.it('Test input fields', function() {
		wd.get("https://www.github.com/login");

		wd.findElement({id: 'login_field'}).getAttribute('data-cip-id').then(function(loginField) {
			new assert.Assertion(loginField).equals('login_field', 'Extension found the login field');
		});

		wd.findElement({id: 'password'}).getAttribute('data-cip-id').then(function(passwordField) {
			new assert.Assertion(passwordField).equals('password', 'Extension found the password field');
		});
	});

	test.it('Test password generator icon', function() {
		wd.get("https://www.github.com/login");

		wd.findElement({className: 'cip-genpw-icon'}).then(function(pwgenIcon) {
			new assert.Assertion(pwgenIcon.isDisplayed(), 'Password generator icon is displayed');

			wd.actions().click(pwgenIcon).perform().then(function() {
				wd.findElement({id: 'kpxc-pw-dialog'}).then(function(pwgenDialog) {
					new assert.Assertion(pwgenDialog.isDisplayed(), 'Password generator dialog is displayed');
				});
			});
		});
	});

	test.it('Test appearing input fields', function() {
		wd.get('https://www.netvibes.com/en#!signin');

		wd.wait(until.elementLocated({name: 'email'}), 10000).then(function() {
			wd.sleep(1000);	// Wait for the animation to complete
			wd.findElement({name: 'email'}).getAttribute('data-cip-id').then(function(loginField) {
				var dataMsg = new RegExp('^jQuery');
				new assert.Assertion(loginField).matches(dataMsg, 'jQuery');
			});

			wd.findElement({name: 'password'}).getAttribute('data-cip-id').then(function(passwordField) {
				var dataMsg = new RegExp('^jQuery');
				new assert.Assertion(passwordField).matches(dataMsg, 'jQuery');
			});
		});
	});
});
