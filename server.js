const express = require("express");
var fs = require('fs');
var log4js = require("log4js");
const { v4: uuidv4 } = require('uuid');
var util = require('util')

const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

const { PromisePool } = require("PromisePool")

const createWord = require('create-word')

require('dotenv').config()

puppeteer.use(StealthPlugin())

log4js.configure({
	appenders: {
		out: { type: 'stdout' },
		app: { type: 'file', filename: 'logs/logs6' }
	},
	categories: {
		default: { appenders: [ 'out' ], level: 'trace' },
		app: { appenders: ['app'], level: 'trace' }
	}
});

const logToFile = log4js.getLogger('app');

let port = process.env.PORT;

if (port == null || port == "") {
	port = 8000;
}

const app = express();

var cedict= JSON.parse(fs.readFileSync('./CEDICT2JSON/cedict-pretty.json', 'utf8'))
var indexedMap = {}
cedict.forEach(x => indexedMap[x.simplified] = {
	pinyin: x.pinyin,
	definitions: x.definitions
})

//Cors allows webpack dev server at localhost:8080 to access my myanmar map API
// app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


app.post("/hydrate-words", async function (req, res, next) {
	try {

		const reqId = uuidv4()

		const userReqWords = req.body
		const username = req.body?.username || "noname"

		const browser = await puppeteer.launch({ 
			headless: true, 
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		})

		//const page = await browser.newPage()
		//page.setDefaultNavigationTimeout(0);

		//page.on('requestfailed', request => {
		//	logToFile.trace(`ONREQFAILED reqid: ${reqId}, url: ${request.url()}, errText: ${request.failure().errorText}, method: ${request.method()}`)
		//});
		////Check for responses that might redirect to broken link
		////
		//page.on('requestfinished', request => {
		//	logToFile.trace(`ONREQFINISHED reqid: ${reqId}, url: ${request.url()}, response: ${util.inspect(request.response())}, method: ${request.method()}`)
		//});
		//// Catch console log errors
		//page.on("pageerror", err => {
		//	logToFile.trace(`Page error: ${err.toString()}`);
		//});
		//// Catch all console messages
		//page.on('console', msg => {
		//	logToFile.trace('Logger:', msg.type());
		//	logToFile.trace('Logger:', msg.text());
		//	logToFile.trace('Logger:', msg.location());

		//});

		//async
		const createUserPromise = createUser(userReqWords, username)

		// Get all words in the database to check against the user's words list
		const words = await getWords()

		const wordMap = {}
		words.forEach(word => {
			wordMap[word.word] = word
		})

		// If word is not in database, it means I haven't scraped it before. Scrape these and add to database.
		// const scrapingQueue = []
		function *wordScrapeGenerator(){
			for(let word of userReqWords){
				if(!wordMap[word]){
					yield scrapeAndCreateWord(word, browser)		
				}
			}
		}
		const scrapeAndCreatePromisePool = new PromisePool(*wordScrapeGenerator(), 5)

		await Promise.all([scrapeAndCreateWordPromise.start(), createUserPromise])

		//Eventually I'll need to return a flashcard url to the use for his first review session
		res.status(200)



		const map = {}
		for(let i = 0; i < words.length; i++){
			const word = words[i]

			const cedictEntry = indexedMap[word]
			const englishDefs = cedictEntry?.definitions || "English definition unavailable"
			const pinyin = cedictEntry?.pinyin || "pinyin unavailable"

			const createWordPromise = createWord(word)

			logToFile.trace(reqId + ' Running test number: ' + i)

			let status = await page.goto('https://hanyu.baidu.com/zici/s?wd=' + word)
			status = status.status();

			logToFile.trace(reqId + " STATUS def", status)

			var chineseDef = await page.evaluate(() => {
				return document.querySelector("dd p")?.innerHTML.trim() || "Chinese definition unavailable"
			})
			map[word] = chineseDef

			logToFile.trace(reqId + " Chinese def number ", i, chineseDef)
			// await page.screenshot({                      // Screenshot the website using defined options
			// 	path: `./Reqid:${ reqId },WordNumber:${ i }.png`,                   // Save the screenshot in current directory
			// 	fullPage: true                              // take a fullpage screenshot
			// });

			status = await page.goto('https://hanyu.baidu.com/s?wd=' + word + '造句')
			status = status.status()
			logToFile.trace(reqId + " STATUS examples", status)

			var examples = await page.evaluate(() => {
				var examplesList = [...document.querySelectorAll(".zaoju-item p")]
				var exampleSentences = examplesList.map(x => {
					return x.innerHTML 
				})
				return exampleSentences
			})

			logToFile.trace(reqId + " Chinese examples number ", i, examples.length)

			//Think carefully about why the "word" closure error happened here

			// console.log("Word: " + word)
			// console.log("Definition: " + chineseDef)
			// console.log("English Definition: " + englishDefs)
			// console.log("Examples: " + examples)

			// const json = {
			// 	bindVars: {
			// 		word,
			// 		chineseDef,
			// 		englishDefs,
			// 		examples,
			// 		repetition: 0,
			// 		interval: 0,
			// 		efactor: 2.5,
			// 		dueDate: dayjs(Date.now()).toISOString()
			// 	}
			// }

			// return fetch("https://api-bullhead-dc53baa7.paas.macrometa.io/_fabric/_system/_api/restql/execute/insert-word", 
			// 	{
			// 		method: "POST",
			// 		headers: {
			// 			"Content-Type": "application/json",
			// 			"Authorization": "apikey " + process.env.MACROMETA_API_KEY
			// 		},
			// 		body: JSON.stringify(json)
			// 	})
			// 	.then(res => res.json())
			// 	.then(res => {
			// 		if(res.error){
			// 			return Promise.reject("POST operation to DB returned error: " + JSON.stringify(res))
			// 		}else{
			// 			return json.bindVars
			// 		}
			// 	})

			// dbOperations.push(dbInsertPromise)
			logToFile.trace(reqId + " current MAP situation", i, map)
		}


		var chineseDefAndExamplesPromise = puppeteer.launch({ 
			headless: true, 
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		}).then(async browser => {


			const map = {}
			for(let i = 0; i < words.length; i++){
				const word = words[i]

				const cedictEntry = indexedMap[word]
				const englishDefs = cedictEntry?.definitions || "English definition unavailable"
				const pinyin = cedictEntry?.pinyin || "pinyin unavailable"

				logToFile.trace(reqId + ' Running test number: ' + i)
				let status = await page.goto('https://hanyu.baidu.com/zici/s?wd=' + word)
				status = status.status();
				logToFile.trace(reqId + " STATUS def", status)

				var chineseDef = await page.evaluate(() => {
					return document.querySelector("dd p")?.innerHTML.trim() || "Chinese definition unavailable"
				})
				map[word] = chineseDef

				logToFile.trace(reqId + " Chinese def number ", i, chineseDef)
				// await page.screenshot({                      // Screenshot the website using defined options
				// 	path: `./Reqid:${ reqId },WordNumber:${ i }.png`,                   // Save the screenshot in current directory
				// 	fullPage: true                              // take a fullpage screenshot
				// });

				status = await page.goto('https://hanyu.baidu.com/s?wd=' + word + '造句')
				status = status.status()
				logToFile.trace(reqId + " STATUS examples", status)

				var examples = await page.evaluate(() => {
					var examplesList = [...document.querySelectorAll(".zaoju-item p")]
					var exampleSentences = examplesList.map(x => {
						return x.innerHTML 
					})
					return exampleSentences
				})

				logToFile.trace(reqId + " Chinese examples number ", i, examples.length)

				//Think carefully about why the "word" closure error happened here

				// console.log("Word: " + word)
				// console.log("Definition: " + chineseDef)
				// console.log("English Definition: " + englishDefs)
				// console.log("Examples: " + examples)

				// const json = {
				// 	bindVars: {
				// 		word,
				// 		chineseDef,
				// 		englishDefs,
				// 		examples,
				// 		repetition: 0,
				// 		interval: 0,
				// 		efactor: 2.5,
				// 		dueDate: dayjs(Date.now()).toISOString()
				// 	}
				// }

				// return fetch("https://api-bullhead-dc53baa7.paas.macrometa.io/_fabric/_system/_api/restql/execute/insert-word", 
				// 	{
				// 		method: "POST",
				// 		headers: {
				// 			"Content-Type": "application/json",
				// 			"Authorization": "apikey " + process.env.MACROMETA_API_KEY
				// 		},
				// 		body: JSON.stringify(json)
				// 	})
				// 	.then(res => res.json())
				// 	.then(res => {
				// 		if(res.error){
				// 			return Promise.reject("POST operation to DB returned error: " + JSON.stringify(res))
				// 		}else{
				// 			return json.bindVars
				// 		}
				// 	})

				// dbOperations.push(dbInsertPromise)
				logToFile.trace(reqId + " current MAP situation", i, map)
			}


			await page.close();
			await browser.close();
		})


		// Promise.all(dbOperations)
		// 	.then(results => {
		// 		console.log("FINAL RESULTS", results)
		// 		res.send(results)
		// 	})
		// 	.catch(next)

	} catch(error){
		return next(error)
	}

});


//async function handler(event) {

//  console.log(event)
//  console.log(event.body)
//  // const newWordsArr = JSON.parse(event.body)
//  //definition, pinyin,
//  //baidu: chinese explanation + example sentences

//  for(var word of ["语重心长", "狂风暴雨", "座无虚席"]){
//    console.log(word)

//    var body

//    try{
//      const pageRes = await fetch('https://hanyu.baidu.com/zici/s?wd=' + word);
//      const examplesRes = await fetch('https://hanyu.baidu.com/s?wd=' + word + '造句');

//      body = await pageRes.text();
//      var { document } = (new JSDOM(body)).window;
//      var chineseDef = document.querySelector("dd p").innerHTML

//      body = await examplesRes.text();
//      var { document } = (new JSDOM(body)).window;
//      var examplesList = [...document.querySelectorAll(".zaoju-item p")]
//      var exampleSentences = examplesList.map(x => {
//        return x.innerHTML 
//      })
//    }catch(e){
//      console.log("ERROR", e)
//    }

//    console.log("Word: " + word)
//    console.log("Definition: " + chineseDef)
//    // fetch("https://api-bullhead-dc53baa7.paas.macrometa.io/_fabric/_system/_api/cursor", 
//    //   {
//    //     method: "POST",
//    //     headers: {
//    //       "Content-Type": "application/json",
//    //     }
//    //     body: `{\"bindVars\":{\"word\":\"${word}\",\"definition\":\"${chineseDef}\",\"examples\":\"${exampleSentences}\"},\"query\":\"INSERT {word:@word,\n        definition:@definition,\n        examples:@examples} \nINTO words\",\"ttl\":0}`
//    //   })
//    //   .then(result => result.json())
//    //   .then(x => x.result.map(y => {
//    //     return {word: y.word, meaning: "IM YJ KING"}
//    //   }))
//    //   .catch(x => console.log(x))
//    console.log("Examples: " + exampleSentences)

//  }


//  try {


//    return {
//      statusCode: 200,
//      headers: {
//        "Content-Type": "application/json; charset=UTF-8",
//        "Access-Control-Allow-Origin": "*"
//      },
//      body: JSON.stringify(res)
//    };

//  } catch (error) {

//    console.log("Error", error)

//    return {
//      statusCode: error.httpStatusCode || 500,
//      body: JSON.stringify(
//        {
//          error: error.message,
//        },
//        null,
//        2
//      ),
//    };
//  }
//}


app.listen(port, () => console.log(`Example app listening on port ${port}!`));
