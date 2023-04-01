const express = require("express");
const Rider = require("../models/rider");
const Driver = require("../models/driver");
const NodeGeocoder = require("node-geocoder");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const router = express.Router();
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

  Rider.findOne({ email: email, password: password }).then((rider) => {
    if (rider) {
      const token = jwt.sign(
        { rider_id: rider._id },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: "48h",
        }
      );
      res.status(200).json({ rider, token });
      return;
    } else {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }
  });
});

router
  .route("/signup")
  .get((req, res) => {
    res.render("rider/signup", { error: "" });
  })
  .post(async (req, res) => {
    const rider = new Rider(req.body);

    rider
      .save()
      .then((savedRider) => {
        res.status(201).json(savedRider);
        return;
      })
      .catch((err) => {
        console.log(err);
        res.json({ error: err });
        return;
      });

    // try {
    //   await rider.save();
    //   res.status(201).render("rider/login", {
    //     error: "User created successfully. Please log in.",
    //   });
    //   res.status(201).json(rider);
    // } catch (err) {
    //   console.log(err);
    //   res.render("rider/signup", { error: err });
    // }
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

    const riderID = decoded.rider_id;

    try {
      const rider = await Rider.findById(riderID);
      const drivers = await Driver.find({
        "location.pincode": rider.location.pincode,
      });

      res.status(200).json({ drivers, rider });
      return;
    } catch (err) {
      res.status(500).json({ error: err });
      return;
    }
  });
});

router.route("/driver-detail/:driverId").get(async (req, res, next) => {
  const driverId = req.params["driverId"];

  Driver.findById(driverId, (err, driver) => {
    if (err) {
      res.status(500).json({ error: err });
    } else {
      if (!driver) {
        res.status(404).json({
          error: "Driver not found",
        });
      }
      res.status(200).json({ driver: driver });
    }
  });
});

router.route("/update-location").post(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(" ")[1];
  let riderID;

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Get the rider ID from the decoded token
    riderID = decoded.rider_id;

    const options = {
      provider: "mapquest",
      httpAdapter: "https",
      apiKey: process.env.MAPQUEST_API_KEY,
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

    const updatedRider = await Rider.findOneAndUpdate(
      { _id: riderID },
      { $set: { location: newLocation } },
      { new: true }
    );

    res.status(201).json({
      rider: updatedRider,
    });
  } catch (err) {
    res.status(400).json({
      error: err.message,
    });
    return;
  }
});

module.exports = router;
