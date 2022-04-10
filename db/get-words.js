const fetch = require("node-fetch-commonjs")
require('dotenv').config()

exports.getWords = async function({ apiKey = process.env.MACROMETA_API_KEY } = {}) {

	const response = await fetch("https://api-bullhead-dc53baa7.paas.macrometa.io/_fabric/_system/_api/restql/execute/getwords", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": "apikey " + apiKey
		}
	})

	const data = await response.json()

	if(data.error){
		return Promise.reject("getwords operation to DB returned error: " + JSON.stringify(data))
	}

	return data.result
}
