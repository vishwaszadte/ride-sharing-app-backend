const mongoose = require("mongoose");
const validator = require("validator");
const locationSchema = require("./schemas/location");

const riderSchema = mongoose.Schema({
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
    minLength: 10,
    maxLength: 10,
  },
  location: {
    type: locationSchema,
  },
});

module.exports = Rider = mongoose.model("Rider", riderSchema);
