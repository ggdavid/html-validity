;(function(win, doc, undefined) {
	'use strict';

	const root = doc.documentElement;

	// Get the currently active tab
	chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
		const url = tab.url;

		// If the URL does not start with http:// or https://, or is not Chrome Extension Gallery
		if (!url.startsWith('http://') && !url.startsWith('https://') || url.startsWith('https://chromewebstore.google.com/')) {
			document.body.innerHTML = 'The validator does not work for this page.';
			document.body.className = 'warn';
			return;
		}

		// Button IDs mapped to validation actions
		const actions = {
			'btn-validate-html': 'HTML',
			'btn-validate-dom': 'DOM'
		};

		// Attach click event listeners to buttons
		for (const [id, action] of Object.entries(actions)) {
			const button = document.getElementById(id);
			if (button) {
				button.addEventListener('click', async () => {
					const w3c = document.getElementById('w3c').checked; 			// Check W3C checkbox
					chrome.runtime.sendMessage({ action, w3c: w3c, tab: tab }); 	// Send message to background script
					window.close(); 												// Close popup window
				});
			}
		}
	});

})(window, document);
