const { scrapeAndCreateWord } = require('./scrape-and-create-word.js');
require('dotenv').config()

// const StealthPlugin = require('puppeteer-extra-plugin-stealth')
// puppeteer.use(StealthPlugin())


beforeAll(async () => {
  await page.setDefaultNavigationTimeout(0);
})

test('macrometa scrape and create word works and response is handled correctly', async () => {
  await scrapeAndCreateWord("语重心长", page)
});

// test('getWords throws errors correctly', async () => {
//   expect.assertions(1);
//   try {
//     await getWords({ apiKey: "hello"})
//   }
//   catch (e) {
//     expect(e).toMatch('getwords operation to DB returned error: ');
//     console.log("Error: " + e)
//   }
// });
