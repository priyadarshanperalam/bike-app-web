const dotenv = require('dotenv');
dotenv.config();

const { MongoClient, ObjectId } = require("mongodb");

MongoClient.connect(
  process.env.CONNECTIONSTRING,
  { useNewUrlParser: true },
  function (err, client) {
    module.exports = client;
		const app = require('./app');
    app.listen(process.env.PORT);
  }
);
