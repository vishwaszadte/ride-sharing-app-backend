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

router.route("/login").post(async (req, res) => {
  const { email, password } = req.body;

  // Ensure email, password are present in the request
  if (!email) {
    return res.status(400).json({ error: "Please enter email." });
  }
  if (!password) {
    return res.status(400).json({ error: "Please enter password." });
  }

  try {
    const driver = await Driver.findOne({ email: email });
    if (!driver) {
      return res.status(404).json({ error: "This driver does not exist" });
    }

    const isValidPassword = await bcrypt.compare(password, driver.password);
    if (!isValidPassword) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    const token = jwt.sign(
      { driver_id: driver._id },
      process.env.JWT_SECRET_KEY
    );

    const { password: _, ...driverWithoutPassword } = driver;

    res.status(200).json({ driver: driverWithoutPassword, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.route("/signup").post(upload.single("photo"), async (req, res) => {
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
      return res.status(500).json({ error: err.message }); // if we get any error while uploading error message will be returned.
    }
    // If not then below code will be executed

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
        const { password: _, ...driverWithoutPassword } = savedDriver;

        return res.status(201).json(driverWithoutPassword);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: err.message });
        return;
      });
  });
});

router.route("/update-location").post(verifyDriverToken, async (req, res) => {
  const { lat, lon } = req.body;
  const driverID = req.driverID;

  const options = {
    provider: "google",
    httpAdapter: "https",
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    formatter: "json",
  };

  const geocoder = NodeGeocoder(options);

  try {
    const data = await geocoder.reverse({
      lat: lat,
      lon: lon,
    });

    const newLocation = {
      formattedAddress: data[0].formattedAddress,
      latitude: data[0].latitude,
      longitude: data[0].longitude,
      city: data[0].city,
      country: data[0].country,
      pincode: data[0].zipcode,
    };

    const updatedDriver = await Driver.findByIdAndUpdate(driverID, {
      $set: { location: newLocation },
    }).select("-password");

    res.status(200).json({
      driver: updatedDriver,
    });
  } catch (err) {
    res.status(500).json({
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
    if (!driver) {
      return res.status(404).json({ error: "Driver not found" });
    }
    if (!driver.location) {
      return res.status(200).json({ rides: [] });
    }
    const pincode = driver.location.pincode;

    // Get all the riders who are in the same pincode as the current driver
    const riders = await Rider.find({ "location.pincode": pincode });

    // If there are not riders in the area, send en empty array as response
    if (!riders.length) {
      return res.status(200).json({ rides: [] });
    }

    const riderIDs = riders.map((rider) => rider._id);

    const rides = await Ride.aggregate([
      {
        $match: {
          rider_id: { $in: riderIDs },
          status: "requested",
        },
      },
      {
        $lookup: {
          from: "riders",
          localField: "rider_id",
          foreignField: "_id",
          as: "rider",
        },
      },
      {
        $unwind: "$rider",
      },
      {
        $project: {
          _id: 0,
          rider: {
            _id: "$rider._id",
            name: "$rider.name",
            phoneNumber: "$rider.phoneNumber",
          },
          ride: "$$ROOT",
        },
      },
    ]);

    // // Loop through each rider and retrieve ride based on rider_id and status as "requested"
    // for (let i = 0; i < riders.length; i++) {
    //   const ride = await Ride.findOne({
    //     rider_id: riders[i]._id,
    //     status: "requested",
    //   });
    //   if (ride) {
    //     rides.push({
    //       rider: {
    //         _id: riders[i]._id,
    //         name: riders[i].name,
    //         phoneNumber: riders[i].phoneNumber,
    //       },
    //       ride: ride,
    //     });
    //   }
    // }

    res.status(200).json({ rides: rides });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

router
  .route("/update-ride/:rideID")
  .put(verifyDriverToken, async (req, res) => {
    const driverID = req.driverID;
    const rideID = req.params["rideID"];
    const newStatus = req.body.status;
    try {
      const ride = await Ride.findByIdAndUpdate(
        rideID,
        { status: newStatus, driver_id: driverID, updated_at: Date.now() },
        { new: true }
      );
      res.status(200).json({ ride });
    } catch (err) {
      res.status(500).json({ message: "Something went wrong" });
    }
  });

router.route("/get-ride/:rideID").get(verifyDriverToken, async (req, res) => {
  const rideID = req.params["rideID"];
  try {
    const ride = await Ride.findById(rideID);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found." });
    }
    const rider = await Rider.findById(ride.rider_id);
    res.status(200).json({
      ride: ride,
      rider: {
        name: rider.name,
        _id: rider._id,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
