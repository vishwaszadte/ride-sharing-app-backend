const express = require("express");
const mongoose = require("mongoose");
const Driver = require("../models/driver");
const multer = require("multer");
const AWS = require("aws-sdk");
const fileUpload = require("express-fileupload");

const storage = multer.memoryStorage({
  destination: function (req, file, cb) {
    cb(null, "");
  },
});

// defining the upload variable for the configuration of photo being uploaded
const upload = multer({ storage: storage });

const router = new express.Router();
router.use(express.json());

router
  .route("/login")
  .get((req, res) => {
    // if (req.session.driverLoggedIn) {
    //   res.render("rider/home");
    // }
    res.render("driver/login", { error: "" });
  })
  .post((req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email) {
      res.render("driver/login", { error: "Please enter email." });
      return;
    }
    if (!password) {
      res.render("driver/login", { error: "Please enter password." });
      return;
    }

    Driver.findOne({ email: email, password: password }).then((driver) => {
      if (driver) {
        req.session.driverLoggedIn = true;
        req.session.driver = driver;
        res.status(200).json({ message: "User logged in successfully" });
      } else {
        res.render("driver/login", { error: "Invalid email or password." });
      }
    });
  });

router
  .route("/signup")
  .get((req, res) => {
    res.render("driver/signup", { error: "" });
  })
  .post(upload.single("photo"), (req, res) => {
    // S3 instance to upload photo to bucket
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY, // accessKeyId that is stored in .env file
      secretAccessKey: process.env.AWS_SECRET_KEY, // secretAccessKey is also store in .env file
    });

    // Definning the params variable to uplaod the photo

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME, // bucket that we made earlier
      Key: req.file.originalname, // Name of the image
      Body: req.file.buffer, // Body which will contain the image in buffer format
      ACL: "public-read-write", // defining the permissions to get the public link
      ContentType: "image/jpeg", // Necessary to define the image content-type to view the photo in the browser with the link
    };

    s3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        res.status(500).json({ error: err }); // if we get any error while uploading error message will be returned.
        return;
      }
      // If not then below code will be executed

      console.log(data);

      const driver = new Driver({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        phoneNumber: req.body.phoneNumber,
        vehicleName: req.body.vehicleName,
        vehicleNumber: req.body.vehicleNumber,
        vehicleType: req.body.vehicleType,
        photo: data.Location,
      });

      driver
        .save()
        .then((result) => {
          res.status(201).render("driver/login", {
            error: "User created successfully. Please log in.",
          });
        })
        .catch((err) => {
          console.log(err);
          res.render("driver/signup", { error: err });
        });
    });
  });

module.exports = router;
