/**
 * HTML Validity 1.0.0
 * Copyright (C) 2025, by David A. Mchedlishvili
 */

let progressInterval = null;

//** Main Event
chrome.runtime.onMessage.addListener(async (message) => {
	// Init variables
	const MAX_POST_LENGTH = 409600;		// maximum 400KB at [19 July 2025, 15:26:42]
	const { action, w3c, tab } = message;
	
	
	//-- Processes the validation
	try {
		let htmlSource;
		// Start processing icon
		startProgressIcon(tab.id);

		// Get HTML source code
		if (action === 'HTML') {
			const resv = await fetch(tab.url);
			htmlSource = await resv.text();

		// Get DOM content
		} else {
			const resv = await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: () => document.documentElement.outerHTML
			});
			htmlSource = "<!DOCTYPE html>\n" + resv[0].result;
		}

		// Use W3C Checker Site or if content length more then 1MB
		if (w3c || htmlSource.length > MAX_POST_LENGTH) {
			await chrome.tabs.create({ url: "https://validator.w3.org/nu/#textarea", index: tab.index+1 }, function (newtab) {
				chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
					if (tabId === newtab.id && changeInfo.status === 'complete') {
						chrome.tabs.onUpdated.removeListener(listener);
						chrome.scripting.executeScript({
							target: { tabId: newtab.id },
							function: function (html) {
								let form = document.getElementById('doc').form;
								form.doc.value = html;
								form.submit.click();
							},
							args: [htmlSource]
						});
					}
				});
			});

			// Stop processing icon
			stopProgressIcon();

			// Set default icon
			const manifest = chrome.runtime.getManifest();
			setAction(tab.id, 'default', manifest.name);


		// Use W3C API Validator
		} else {
			// Send to validator.w3.org
			const response = await fetch('https://validator.w3.org/nu/?out=json', {
				method: 'POST',
				headers: { 'Content-Type': 'text/html; charset=utf-8' },
				body: htmlSource
			});
			if (!response.ok) throw new Error(`W3C Validator returned HTTP code ${response.status} ${response.statusText}`);
			const data = await response.json();
			const messages = data.messages;

			// Stop processing icon
			stopProgressIcon();

			// Log with colors in DevTools Console
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: (messages, action) => {
					// sorting messages by 'lastLine'
					messages.sort((a, b) => {
						return (a.lastLine ?? Infinity) - (b.lastLine ?? Infinity);
					});
					// errors and warnings
					if (messages.length > 0) {
						console.group(`${action} Validation Results [${messages.length}]:`);
						messages.forEach(msg => {
							let type =  msg.type === 'error' ? 'error' : 'warn',
								line = msg.lastLine > 0 ? `line ${msg.lastLine}: ` : '';
							console[type](`${line}${msg.message}`);
						});
						console.groupEnd();
					// is valid
					} else console.info(`${action} Validation Result: Document is valid`);
				},
				args: [messages, action]
			});

			//-- Set icon depending on validation result
			messages.length
				? setAction(tab.id, 'invalid', `${messages.length} validation errors.`)
				: setAction(tab.id, 'valid', 'Page is valid.');

		}

	//-- This block runs if 'fetch', or 'response.json' fails.
	} catch (error) {
		const message = `${action} validation failed: ${error.message}`;
		// Stop processing icon
		stopProgressIcon();
		// Display error in Service Worker Console
		console.error(message);
		// Display error in DevTools Console
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: (message) => { console.error(message); },
			args: [message]
		});
		// Change icon
		setAction(tab.id, 'error', message);

	}

});


//** Set Action Icon and title
function setAction(tabId, icon, title) {
	// Set text label
	if (typeof title === 'string') chrome.action.setTitle({tabId: tabId, title: title});
	// Set icon
	chrome.action.setIcon({tabId: tabId, path: `icons/${icon}.png` });
}

//** Starts the loading animation
function startProgressIcon(tabId) {
	let i = 0;
	progressInterval = setInterval(() => {
		setAction(tabId, 'process_'+(i % 10), 'Validation in progress...');
		i++;
	}, 150);
}

//** Stops the loading animation
function stopProgressIcon() {
	if (progressInterval) clearInterval(progressInterval);
	progressInterval = null;
}

