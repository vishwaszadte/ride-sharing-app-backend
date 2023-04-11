const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  rider_id: {
    type: String,
    required: true,
  },
  driver_id: {
    type: String,
    default: "",
  },
  source: {
    type: String,
    required: true,
  },
  destination: {
    type: String,
    required: true,
  },
  cost: {
    type: Number,
    // required: true,
  },
  status: {
    type: String,
    enum: ["requested", "accepted", "completed"],
    default: "requested",
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Ride = mongoose.model("Ride", rideSchema);
