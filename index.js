const express = require("express");
require("./database/index");
const session = require("express-session");
const fs = require("fs");
require("dotenv").config();
const cors = require("cors");

// console.log(process.env);

// routes
const driverRouter = require("./routes/driver");
const riderRouter = require("./routes/rider");

const app = express();
const port = process.env.PORT || 3000;

app.disable("etag");

// set ejs as the default templating engine
app.set("view engine", "ejs");

// Middlewares
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: "*",
  })
);

app.get("/", function (req, res) {
  res.render("home");
});

app.use("/driver", driverRouter);
app.use("/rider", riderRouter);

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
