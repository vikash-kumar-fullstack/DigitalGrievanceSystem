const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },
    isVerified: {
    type: Boolean,
    default: false
  },

    role: {
      type: String,
      enum: ["student", "department", "admin"],
      default: "student",
    },

    // Only for department/admin users
    level: {
      type: Number,
      default: null,
    },

    // Used for escalation hierarchy
    parentDepartment: {
      type: String,
      default: null,
    },

    // Department name (only for department role)
    department: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
