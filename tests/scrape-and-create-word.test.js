const { scrapeAndCreateWord } = require('../db/scrape-and-create-word.js');
const util = require("util")
require('dotenv').config()

// const StealthPlugin = require('puppeteer-extra-plugin-stealth')
// puppeteer.use(StealthPlugin())

test('scrape and create word completes without error', async () => {
  await scrapeAndCreateWord("语重心长", browser)
});
