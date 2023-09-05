const express = require("express");
const Rider = require("../models/rider");
const Driver = require("../models/driver");
const Ride = require("../models/ride");
const NodeGeocoder = require("node-geocoder");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { verifyRiderToken } = require("../middlewares/auth");
const bcrypt = require("bcrypt");
const router = express.Router();

router.route("/login").post(async (req, res) => {
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

  try {
    const rider = await Rider.findOne({ email: email });
    if (!rider) {
      return res.status(404).json({ error: "This rider does not exist" });
    }

    const isValidPassword = await bcrypt.compare(password, rider.password);
    if (!isValidPassword) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    const token = jwt.sign({ rider_id: rider._id }, process.env.JWT_SECRET_KEY);

    const { password: _, ...riderWithoutPassword } = rider.toObject();

    res.status(200).json({ rider: riderWithoutPassword, token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

router
  .route("/signup")
  .get((req, res) => {
    res.render("rider/signup", { error: "" });
  })
  .post(async (req, res) => {
    const password = req.body.password;
    const rider = new Rider(req.body);

    try {
      // Hash the password
      const hash = await bcrypt.hash(password, 10);
      rider.password = hash;

      const savedRider = await rider.save();

      const { password: _, ...riderWithoutPassword } = savedRider.toObject();

      res.status(201).json(riderWithoutPassword);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

router.route("/home").get(verifyRiderToken, async (req, res) => {
  const riderID = req.riderID;

  try {
    const rider = await Rider.findById(riderID).select("-password");
    if (!rider) {
      return res.status(404).json({ error: "Rider not found" });
    }

    const drivers = await Driver.find({
      "location.pincode": rider.location.pincode,
    }).select("-password");

    res.status(200).json({ drivers, rider });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router
  .route("/driver-detail/:driverId")
  .get(verifyRiderToken, async (req, res, next) => {
    const driverId = req.params["driverId"];

    try {
      const driver = await Driver.findById(driverId).select("-password");
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.status(200).json({ driver: driver });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

router.route("/update-location").post(verifyRiderToken, async (req, res) => {
  const riderID = req.riderID;

  const { lat, lon } = req.body;

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

    const updatedRider = await Rider.findByIdAndUpdate(riderID, {
      $set: { location: newLocation },
    }).select("-password");

    res.status(200).json({
      rider: updatedRider,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

router.route("/request-ride").post(verifyRiderToken, async (req, res) => {
  const { source, destination } = req.body;
  const riderID = req.riderID;

  try {
    const rider = await Rider.findById(riderID);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    const newRide = new Ride({
      rider_id: riderID,
      source: source,
      destination: destination,
      status: "requested",
    });

    await newRide.save();
    res.status(201).json({ message: "Ride requested successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.route("/get-ride-info").get(verifyRiderToken, async (req, res) => {
  const riderID = req.riderID;
  try {
    const ride = await Ride.findOne({ rider_id: riderID });
    // If ride not found
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // If ride is still at requested
    if (ride.status === "requested") {
      return res.status(200).json({ ride: ride });
    }

    // Fetching the driver info if the ride is accepted
    if (
      ride.status === "accepted" ||
      ride.status === "started" ||
      ride.status === "completed"
    ) {
      const driver = await Driver.findById(ride.driver_id);

      // If the driver is not found
      if (!driver) {
        return res.status(404).json({ message: "Driver info not found" });
      }

      // Everything is fine
      res.status(200).json({ ride: ride, driver: driver });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.route("/get-ride-status").get(verifyRiderToken, async (req, res) => {
  const riderID = req.riderID;
  try {
    const ride = await Ride.findOne({
      rider_id: riderID,
      status: { $nin: ["completed", "declined"] },
    });
    if (!ride) {
      return res.status(404).json({ status: "none" });
    }

    res.status(200).json({ status: ride.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
