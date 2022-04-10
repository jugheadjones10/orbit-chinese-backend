const fetch = require("node-fetch-commonjs")
const fs = require("fs")
require('dotenv').config()

var cedict= JSON.parse(fs.readFileSync('./CEDICT2JSON/cedict-pretty.json', 'utf8'))
var indexedMap = {}
cedict.forEach(x => indexedMap[x.simplified] = {
	pinyin: x.pinyin,
	definitions: x.definitions
})

exports.scrapeAndCreateWord = async function(word, browser) {
	// This takes 7s seconds for one word, which is way too long. Not sure why.

	async function setupPage(url){
		const page = await browser.newPage()
		await page.setDefaultNavigationTimeout(0);
		await page.goto(url)
		return page
	}

	const cedictEntry = indexedMap[word]
	const englishDefs = cedictEntry?.definitions || "English definition unavailable"
	const pinyin = cedictEntry?.pinyin || "pinyin unavailable"

	console.time("page scrape times")
	var chineseDefPromise = setupPage('https://hanyu.baidu.com/zici/s?wd=' + word).then(page => {
		return page.evaluate(() => {
			return document.querySelector("dd p")?.innerHTML.trim() || "Chinese definition unavailable"
		})
	})

	var examplesPromise = setupPage('https://hanyu.baidu.com/s?wd=' + word + '造句').then(page => {
		return page.evaluate(() => {
			var examplesList = [...document.querySelectorAll(".zaoju-item p")]
			var exampleSentences = examplesList.map(x => {
				return x.innerHTML 
			})
			return exampleSentences
		})
	})

	const [chineseDef, examples] = await Promise.all([chineseDefPromise, examplesPromise])
	console.timeEnd("page scrape times")

	// Let's try not doing the below. Trust that closing the browser will be enough.
	// chineseDefPagePromise.then(page => page.close())
	// examplesPagePromise.then(page => page.close())

	const body = {
		bindVars: {
			word,
			chineseDef,
			englishDefs,
			examples
		}
	}
	console.log("Scraping results", JSON.stringify(body))

	console.time("DB operation")
	const response = await fetch("https://api-bullhead-dc53baa7.paas.macrometa.io/_fabric/_system/_api/restql/execute/insert-word", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": "apikey " + process.env.MACROMETA_API_KEY
		},
		body: JSON.stringify(body)
	})
	console.timeEnd("DB operation")

	const data = await response.json()

	if(data.error){
		return Promise.reject("insert-word operation to DB returned error: " + JSON.stringify(data))
	}

	console.log("DB data response", data)
}
