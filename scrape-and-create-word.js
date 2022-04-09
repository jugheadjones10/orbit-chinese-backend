const fetch = require("node-fetch-commonjs")
const fs = require("fs")
require('dotenv').config()

var cedict= JSON.parse(fs.readFileSync('./CEDICT2JSON/cedict-pretty.json', 'utf8'))
var indexedMap = {}
cedict.forEach(x => indexedMap[x.simplified] = {
	pinyin: x.pinyin,
	definitions: x.definitions
})

exports.scrapeAndCreateWord = async function(word, page) {

	const cedictEntry = indexedMap[word]
	const englishDefs = cedictEntry?.definitions || "English definition unavailable"
	const pinyin = cedictEntry?.pinyin || "pinyin unavailable"

	// logToFile.trace(reqId + ' Running test number: ' + i)

	let status = await page.goto('https://hanyu.baidu.com/zici/s?wd=' + word)
	// status = status.status();

	// logToFile.trace(reqId + " STATUS def", status)

	var chineseDefPromise = page.evaluate(() => {
		return document.querySelector("dd p")?.innerHTML.trim() || "Chinese definition unavailable"
	}).catch(e => console.log("Chinese Def Error", e))

	// logToFile.trace(reqId + " Chinese def number ", i, chineseDef)
	// await page.screenshot({                      // Screenshot the website using defined options
	// 	path: `./Reqid:${ reqId },WordNumber:${ i }.png`,                   // Save the screenshot in current directory
	// 	fullPage: true                              // take a fullpage screenshot
	// });

	// status = await page.goto('https://hanyu.baidu.com/s?wd=' + word + '造句')
	// status = status.status()
	// logToFile.trace(reqId + " STATUS examples", status)

	var examplesPromise = page.evaluate(() => {
		var examplesList = [...document.querySelectorAll(".zaoju-item p")]
		console.log("Examples list", examplesList)
		var exampleSentences = examplesList.map(x => {
			return x.innerHTML 
		})
		return exampleSentences
	}).catch(e => console.log("Examples Error", e))

	// logToFile.trace(reqId + " Chinese examples number ", i, examples.length)

	const [chineseDef, examples] = await Promise.all([chineseDefPromise, examplesPromise])

	const body = {
		bindVars: {
			word,
			chineseDef,
			englishDefs,
			examples,
			// repetition: 0,
			// interval: 0,
			// efactor: 2.5,
			// dueDate: dayjs(Date.now()).toISOString()
		}
	}
	console.log("Scraping results", JSON.stringify(body))

	const response = await fetch("https://api-bullhead-dc53baa7.paas.macrometa.io/_fabric/_system/_api/restql/execute/insert-word", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": "apikey " + process.env.MACROMETA_API_KEY
			},
			body: JSON.stringify(body)
		})

	const data = await response.json()

	if(data.error){
		return Promise.reject("insert-word operation to DB returned error: " + JSON.stringify(data))
	}

}
