const { createUser } = require('../db/create-user.js');

test('user creation with words', async () => {
  await createUser(["语重心长", "狂风暴雨", "座无虚席", "美不胜收",  "轻于鸿毛",  "鱼贯而入", "司空见惯"], "feynman69")
});
