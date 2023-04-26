const express = require("express");
const Driver = require("../models/driver");
const multer = require("multer");
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");
const NodeGeocoder = require("node-geocoder");
const Rider = require("../models/rider");
const { verifyDriverToken } = require("../middlewares/auth");
const bcrypt = require("bcrypt");
const Ride = require("../models/ride");

const storage = multer.memoryStorage({
  destination: function (req, file, cb) {
    cb(null, "");
  },
});

// defining the upload variable for the configuration of photo being uploaded
const upload = multer({ storage: storage });

const router = new express.Router();
router.use(express.json());

router.route("/login").post((req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email) {
    res.status(400).json({ error: "Please enter email." });
    return;
  }
  if (!password) {
    res.status(400).json({ error: "Please enter password." });
    return;
  }

  Driver.findOne({ email: email }).then(async (driver) => {
    if (driver) {
      const result = await bcrypt.compare(password, driver.password);
      if (result) {
        const token = jwt.sign(
          { driver_id: driver._id },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: "48h",
          }
        );
        return res.status(200).json({ driver, token });
      } else {
        res.status(400).json({ error: "Incorrect password" });
      }
    } else {
      res.status(404).json({ error: "This driver does not exist" });
    }
  });
});

router.route("/signup").post(upload.single("photo"), (req, res) => {
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

  s3.upload(params, async (err, data) => {
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

    const password = req.body.password;
    const hash = await bcrypt.hash(password, 10);
    driver.password = hash;

    driver
      .save()
      .then((savedDriver) => {
        res.status(201).json(savedDriver);
        return;
      })
      .catch((err) => {
        console.log(err);
        res.json({ error: err });
        return;
      });
  });
});

router.route("/home").get(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(" ")[1];

  // Verify and decode the token
  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decoded) => {
    if (err) {
      // Handle token verification error
      return res.status(401).json({ message: "Invalid token" });
    }

    const driverID = decoded.driver_id;

    // try {
    //   const rider = await Rider.findById(riderID);
    //   const drivers = await Driver.find({
    //     "location.pincode": rider.location.pincode,
    //   });

    //   res.status(200).json({ drivers, rider });
    //   return;
    // } catch (err) {
    //   res.status(500).json({ error: err });
    //   return;
    // }

    res.status(200).json(driverID);
  });
});

router.route("/update-location").post(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(" ")[1];
  let driverID;

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Get the rider ID from the decoded token
    driverID = decoded.driver_id;

    const options = {
      provider: "google",
      httpAdapter: "https",
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      formatter: "json",
    };

    const geocoder = NodeGeocoder(options);

    const data = await geocoder.reverse({
      lat: req.body.lat,
      lon: req.body.lon,
    });

    const newLocation = {
      formattedAddress: data[0].formattedAddress,
      latitude: data[0].latitude,
      longitude: data[0].longitude,
      city: data[0].city,
      country: data[0].country,
      pincode: data[0].zipcode,
    };

    const updatedDriver = await Driver.findOneAndUpdate(
      { _id: driverID },
      { $set: { location: newLocation } },
      { new: true }
    );

    res.status(200).json({
      driver: updatedDriver,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
    return;
  }
});

router.route("/get-rides").get(verifyDriverToken, async (req, res) => {
  const driverID = req.driverID;
  try {
    // Get the current driver
    const driver = await Driver.findById(driverID);
    const pincode = driver.location.pincode;

    // Get all the riders who are in the same pincode as the current driver
    const riders = await Rider.find({ "location.pincode": pincode });

    // If there are not riders in the area, send en empty array as response
    if (!riders.length) {
      return res.status(200).json({ rides: [] });
    }

    // Initialize an empty rides array
    const rides = [];

    // Loop through each rider and retrieve ride based on rider_id and status as "requested"
    for (let i = 0; i < riders.length; i++) {
      const ride = await Ride.findOne({
        rider_id: riders[i]._id,
        status: "requested",
      });
      if (ride) {
        rides.push({
          rider: {
            _id: riders[i]._id,
            name: riders[i].name,
            phoneNumber: riders[i].phoneNumber,
          },
          ride: ride,
        });
      }
    }

    res.status(200).json({ rides: rides });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
