const fs = require('fs');
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

puppeteer.use(StealthPlugin())

var cedict= JSON.parse(fs.readFileSync('./CEDICT2JSON/cedict-pretty.json', 'utf8'))
var indexedMap = {}
cedict.forEach(x => indexedMap[x.simplified] = {
	pinyin: x.pinyin,
	definitions: x.definitions
})

export default async function createWord(word) {


	const page = await browser.newPage()
	page.setDefaultNavigationTimeout(0);

	page.on('requestfailed', request => {
		logToFile.trace(`ONREQFAILED reqid: ${reqId}, url: ${request.url()}, errText: ${request.failure().errorText}, method: ${request.method()}`)
	});
	//Check for responses that might redirect to broken link
	//
	page.on('requestfinished', request => {
		logToFile.trace(`ONREQFINISHED reqid: ${reqId}, url: ${request.url()}, response: ${util.inspect(request.response())}, method: ${request.method()}`)
	});
	// Catch console log errors
	page.on("pageerror", err => {
		logToFile.trace(`Page error: ${err.toString()}`);
	});
	// Catch all console messages
	page.on('console', msg => {
		logToFile.trace('Logger:', msg.type());
		logToFile.trace('Logger:', msg.text());
		logToFile.trace('Logger:', msg.location());

	});
}
