const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  formattedAddress: {
    type: String,
    default: "RSCOE, Tathawade",
    required: true,
  },
  latitude: {
    type: Number,
    default: 100,
    required: true,
  },
  longitude: {
    type: Number,
    default: 100,
    required: true,
  },
  city: {
    type: String,
    default: "Pune",
    required: true,
  },
  country: {
    type: String,
    default: "India",
    required: true,
  },
  pincode: {
    type: String,
    default: "411033",
    required: true,
  },
});

module.exports = locationSchema;
