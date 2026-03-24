const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "Pending",
    },
    remarks: {
  type: String,
  default: null
  },
  proofDocument: {
    type: String,
    default: null
  },
  escalatedTo: {
  type: String,
  default: null
},
lastUpdatedAt: {
  type: Date,
  default: Date.now
},

createdAt: {
  type: Date,
  default: Date.now
},
timeline: [
  {
    status: String,
    message: String,
    date: {
      type: Date,
      default: Date.now
    }
  }
]
  },
  
  { timestamps: true }
  
);

module.exports = mongoose.model("Complaint", complaintSchema);
