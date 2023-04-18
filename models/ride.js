const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  rider_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: true,
  },
  driver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null,
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
    enum: ["requested", "accepted", "started", "completed"],
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
