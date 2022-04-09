const { getWords } = require('./get-words.js');
require('dotenv').config()

test('macrometa fetch works and response is handled correctly', async () => {
  const words = await getWords()
  expect(words).toBeTruthy()
  expect(words.length).toBeGreaterThan(0)
  console.log("Number of words: " + words.length)
});

test('getWords throws errors correctly', async () => {
  expect.assertions(1);
  try {
    await getWords({ apiKey: "hello"})
  }
  catch (e) {
    expect(e).toMatch('getwords operation to DB returned error: ');
    console.log("Error: " + e)
  }
});
