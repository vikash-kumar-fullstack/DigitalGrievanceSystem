require("dotenv").config();
require('dns').setDefaultResultOrder('ipv4first'); 
require("./utils/cronJobs");
const express = require("express");
const mongoose = require("mongoose");
const Complaint = require("./models/Complaint");
const User = require("./models/User"); // ✅ FIXED
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const auth = require("./middleware/auth.middleware");
const checkRole = require("./middleware/role.middleware");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const sendNotification = require("./utils/sendNotification");
const Notification = require("./models/Notification");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ================= MIDDLEWARE =================
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.set("view engine", "ejs");

// ================= ROUTES =================
app.use("/api/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use(errorHandler);
// ================= ROOT =================
app.get("/", (req, res) => {
  res.redirect("/login");
});

// ================= AUTH PAGES =================
app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register", {
    error: null,
    oldData: null // 
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// ================= STUDENT =================
app.get(
  "/student/dashboard",
  auth,
  checkRole("student"),
  async (req, res) => {
    const complaints = await Complaint.find({
      student: req.user.id,
    }).sort({ createdAt: -1 });

    const notifications = await Notification.find({
    user: req.user.id
  }).sort({ createdAt: -1 });
    res.render("student-dashboard", {user: req.user,notifications, complaints });
  }


);

app.post(
  "/student/submit-complaint",
  auth,
  checkRole("student"),
  async (req, res) => {
    try {
      const { department, message } = req.body;

      await Complaint.create({
        student: req.user.id,
        department,
        message,

        timeline: [
          {
            status: "Submitted",
            message: "Complaint submitted by student"
          }
        ]
      });
      const deptUser = await User.findOne({
        department,
        role: "department"
      });

      if (deptUser) {
        const io = req.app.get("io");
        await sendNotification(
          deptUser._id,
          "New complaint assigned to your department",io
        );
}
      res.redirect("/student/dashboard");

    } catch (err) {
      console.log(err);
      res.status(500).send("Error submitting complaint");
    }
  }
);

// ================= ADMIN =================
app.get(
  "/admin/dashboard",
  auth,
  checkRole("admin"),
  async (req, res) => {
    try {
      const totalComplaints = await Complaint.countDocuments();

      const pending = await Complaint.countDocuments({
        status: "Pending"
      });

      const inProgress = await Complaint.countDocuments({
        status: "In Progress"
      });

      const resolved = await Complaint.countDocuments({
        status: "Resolved"
      });

      const complaintsByDept = await Complaint.aggregate([
  {
    $group: {
      _id: "$department",
      count: { $sum: 1 }
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "department",
      as: "dept"
    }
  },
  {
    $unwind: "$dept"
  },
  {
    $project: {
      _id: "$dept.name",
      count: 1
    }
  }
]);

      // optional: populate department name
      const deptData = await User.find({ role: "department" });

      const recentComplaints = await Complaint.find()
        .sort({ createdAt: -1 })
        .limit(5);

      res.render("admin-dashboard", {
        user: req.user,
        totalComplaints,
        pending,
        inProgress,
        resolved,
        complaintsByDept,
        deptData,
        recentComplaints
      });

    } catch (err) {
      console.log(err);
      res.status(500).send("Error loading admin dashboard");
    }
  }
);
// ================= DEPARTMENT =================
app.get(
  "/department/dashboard",
  auth,
  checkRole("department"),
  async (req, res) => {
    const complaints = await Complaint.find({
      department: req.user.department,
    }).sort({ createdAt: -1 });

    const notifications = await Notification.find({
    user: req.user.id
  }).sort({ createdAt: -1 });
    res.render("department-dashboard", {user: req.user, notifications,complaints });
  }
);

// ================= FILE UPLOAD =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files allowed"));
    }
  },
});

// ================= STATUS UPDATE =================
app.post(
  "/department/update-status/:id",
  auth,
  checkRole("department"),
  upload.single("proofDocument"),
  async (req, res) => {
    try {
      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).send("Complaint not found");
      }

      const updateData = {
        status: req.body.status,
        lastUpdatedAt: new Date()
      };

      let timelineEntry = {
        status: req.body.status,
        message: ""
      };

      if (req.body.status === "In Progress") {
        timelineEntry.message = "Department started working on complaint";
      }

      if (req.body.status === "Resolved") {
        updateData.remarks = req.body.remarks;
        updateData.proofDocument = req.file
          ? req.file.filename
          : null;

        timelineEntry.message = "Complaint resolved with proof uploaded";
      }

      await Complaint.findByIdAndUpdate(req.params.id, {
        ...updateData,
        $push: { timeline: timelineEntry }
      });

      const io = req.app.get("io");
      await sendNotification(
        complaint.student,
        `Your complaint status updated to ${req.body.status}`,io
      );

      res.redirect("/department/dashboard");

    } catch (err) {
      console.log(err);
      res.status(500).send("Error updating complaint");
    }
  }
);

// ================= ESCALATION =================
app.post(
  "/student/escalate/:id",
  auth,
  checkRole("student"),
  async (req, res) => {
    try {
      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).send("Complaint not found");
      }

      const currentDept = await User.findOne({
        department: complaint.department,
        role: "department",
      });

      if (!currentDept || !currentDept.parentDepartment) {
        return res.send("This complaint has reached the highest authority");
      }

      const nextDept = await User.findOne({
        department: currentDept.parentDepartment,
        role: "department",
      });

      if (!nextDept) {
        return res.send("No higher authority available");
      }

      complaint.escalationHistory.push({
        department: currentDept._id
      });

      complaint.timeline.push({
        status: "Escalated",
        message: "Complaint escalated to higher authority"
      });

      complaint.department = nextDept.department;
      complaint.status = "Pending";
      complaint.lastUpdatedAt = new Date();

      await complaint.save();

      const io = req.app.get("io");
      await sendNotification(
        nextDept._id,
        "A complaint has been escalated to your department",io
      );

      res.redirect("/student/dashboard");

    } catch (err) {
      console.log(err);
      res.status(500).send("Error escalating complaint");
    }
  }
);

// ================= DB =================
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4 
})
.then(() => console.log("MongoDB Connected"))
.catch(err => {
  console.log("Mongo Error:", err);
  process.exit(1);
});
// ================= SERVER =================
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server);

app.set("io", io); 

io.on("connection", (socket) => {

  // user joins their own room
  socket.on("join", (userId) => {
    socket.join(userId);
  });

  socket.on("disconnect", () => {
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on", PORT);
});