const cron = require("node-cron");
const Complaint = require("../models/Complaint");
const User = require("../models/User");

// runs every 1 hour
cron.schedule("0 * * * *", async () => {
  console.log("Running auto escalation check...");

  try {
    const complaints = await Complaint.find({
      status: { $ne: "Resolved" }
    }).populate("department");

    const now = new Date();

    for (let complaint of complaints) {
      const diffHours = (now - complaint.lastUpdatedAt) / (1000 * 60 * 60);

      // SLA: 48 hours
      if (diffHours >= 48) {
        const currentDept = await User.findById(complaint.department._id);

        if (currentDept.parentDepartment) {

          // save history
          complaint.escalationHistory.push({
            department: currentDept._id
          });

          // escalate
          complaint.department = currentDept.parentDepartment;
          complaint.status = "Pending";
          complaint.lastUpdatedAt = new Date();

          await complaint.save();

          console.log(`Escalated complaint ${complaint._id}`);
        }
      }
    }

  } catch (err) {
    console.log("Cron error:", err);
  }
});