const mongoose = require("mongoose");
require("dotenv").config();

mongoose.set("strictQuery", false);

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("db is live");
  })
  .catch((e) => {
    console.log(e);
    console.log("error connecting to the db");
  });
