const mongoose = require("mongoose");
const validator = require("validator");
const locationSchema = require("./schemas/location");

const driverSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error("Invalid email address: " + value);
      }
    },
  },
  password: {
    type: String,
    required: true,
    trim: true,
    minlength: 8,
    validate(value) {
      if (value.toLowerCase().includes("password") || value.includes("1234")) {
        throw new Error("Weak password");
      }
    },
  },
  phoneNumber: {
    type: String,
    trim: true,
    minlength: 9,
  },
  vehicleName: {
    type: String,
    required: true,
  },
  vehicleNumber: {
    type: String,
    required: true,
  },
  vehicleType: {
    type: String,
    required: true,
  },
  photo: {
    type: String,
  },
  location: {
    type: locationSchema,
    default: {
      formattedAddress: "RSCOE, Tathawade",
      latitude: 18.632096514025942,
      longitude: 73.84571163425848,
      city: "Pune",
      country: "India",
      pincode: "411033",
    },
    required: true,
  },
});

module.exports = Driver = mongoose.model("Driver", driverSchema);
