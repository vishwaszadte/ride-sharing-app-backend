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
        { rider_id: rider._id, email: rider.email },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: "48h",
        }
      );
      res.status(200).json({ rider, token });
    } else {
      res.status(400).json({ error: "Invalid email or password" });
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
      })
      .catch((err) => {
        console.log(err);
        res.json({ error: err });
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
  let riderID;

  // Verify and decode the token
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      // Handle token verification error
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get the rider ID from the decoded token
    riderID = decoded.rider_id;
  });
  // const riderID = req.session.rider._id;

  const filter = {};

  try {
    const drivers = await Driver.find(filter);
    const rider = await Rider.findById(riderID);

    res.status(200).json({ drivers, rider });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

router.route("/driver-detail/:driverId").get(async (req, res, next) => {
  const driverId = req.params["driverId"];

  Driver.findById(driverId, (err, driver) => {
    if (err) {
      res
        .status(500)
        .render("rider/driver-detail", { driver: driver, error: null });
    } else {
      if (!driver) {
        res.status(404).render("rider/driver-detail", {
          driver: driver,
          error: "Driver not found",
        });
      }
      res
        .status(200)
        .render("rider/driver-detail", { driver: driver, error: null });
    }
  });
});

router.route("/update-location").post(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.split(" ")[1];
  let riderID;

  // Verify and decode the token
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      // Handle token verification error
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get the rider ID from the decoded token
    riderID = decoded.rider_id;
  });

  const options = {
    provider: "mapquest",
    httpAdapter: "https",
    apiKey: process.env.MAPQUEST_API_KEY,
    formatter: "json",
  };

  const geocoder = NodeGeocoder(options);

  try {
    data = await geocoder.reverse({ lat: req.body.lat, lon: req.body.lon });

    const newLocation = {
      formattedAddress: data[0].formattedAddress,
      latitude: data[0].latitude,
      longitude: data[0].longitude,
      city: data[0].city,
      country: data[0].country,
      pincode: data[0].zipcode,
    };

    Rider.findOneAndUpdate(
      { _id: riderID },
      { $set: { location: newLocation } },
      { new: true }
    )
      .then((updatedRider) => {
        res.status(201).json({
          rider: updatedRider,
        });
      })
      .catch((err) => {
        res.status(400).json({
          error: err,
        });
      });
  } catch (err) {
    res.status(400).json({
      error: err,
    });
  }
});

module.exports = router;
