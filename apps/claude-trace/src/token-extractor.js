// Token extractor for OAuth token extraction
const fs = require("fs");
const path = require("path");
const os = require("os");
const originalFetch = global.fetch;

// Get token file from environment variable
const TEMP_TOKEN_FILE = process.env.CLAUDE_TRACE_TOKEN_FILE;

function readClaudeSettings() {
	try {
		const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
		if (fs.existsSync(settingsPath)) {
			const settingsContent = fs.readFileSync(settingsPath, "utf8");
			return JSON.parse(settingsContent);
		}
	} catch (error) {
		// Silent error handling - settings file might be malformed
	}
	return null;
}

function getAnthropicBaseUrl() {
	// First try to read from settings.json
	const settings = readClaudeSettings();
	if (settings?.env?.ANTHROPIC_BASE_URL) {
		return settings.env.ANTHROPIC_BASE_URL;
	}

	// Fallback to environment variable
	if (process.env.ANTHROPIC_BASE_URL) {
		return process.env.ANTHROPIC_BASE_URL;
	}

	// Default to api.anthropic.com
	return "https://api.anthropic.com";
}

global.fetch = async function (input, init = {}) {
	const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

	// Get base URL from settings, env, or default
	const baseUrl = getAnthropicBaseUrl();
	const apiHost = new URL(baseUrl).hostname;

	if (url.includes(apiHost) && url.includes("/v1/messages")) {
		const headers = new Headers(init.headers || {});
		const authorization = headers.get("authorization");
		if (authorization && authorization.startsWith("Bearer ") && TEMP_TOKEN_FILE) {
			const token = authorization.substring(7);
			try {
				fs.writeFileSync(TEMP_TOKEN_FILE, token);
			} catch (e) {
				// Ignore write errors silently
			}
		}
	}

	return originalFetch(input, init);
};
