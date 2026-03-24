const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOtp = require("../utils/sendOtp");
// 🔥 at top of authController.js
const tempUsers = new Map();
// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const emailRegex = /^bt\d{2}cs\d{3}@nitmz\.ac\.in$/;

    if (!emailRegex.test(email)) {
  return res.render("register", {
    error: "Enter valid institute email",
    oldData: { name, email } // 🔥 ADD THIS
  });
}

const userExists = await User.findOne({ email });
if (userExists) {
  return res.render("register", {
    error: "User already exists",
    oldData: { name, email } // 🔥 ADD THIS
  });
}

    const otp = Math.floor(100000 + Math.random() * 900000);

    tempUsers.set(email, {
      name,
      password,
      otp,
      createdAt: Date.now()
    });

    await sendOtp(email, otp);

    res.render("verify-otp", { email });

  } catch (err) {
    console.log("OTP ERROR:", err);
    res.send("Error sending OTP");
  }
};

// ================= LOGIN =================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.render("login", {
        error: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        error: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        department: user.department
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, { httpOnly: true });

    // 🔥 Role-based redirect
    if (user.role === "student") {
      return res.redirect("/student/dashboard");
    }

    if (user.role === "admin") {
      return res.redirect("/admin/dashboard");
    }

    if (user.role === "department") {
      return res.redirect("/department/dashboard");
    }

  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const tempUser = tempUsers.get(email);

    if (!tempUser) {
      return res.send("Session expired");
    }

    // 🔥 OTP EXPIRY CHECK
    if (Date.now() - tempUser.createdAt > 5 * 60 * 1000) {
      tempUsers.delete(email);
      return res.render("verify-otp", {
        email,
        error: "OTP expired. Please register again."
      });
    }

    if (tempUser.otp != otp) {
      return res.render("verify-otp", {
        email,
        error: "Invalid OTP"
      });
    }

    const hashedPassword = await bcrypt.hash(tempUser.password, 10);

    const user = await User.create({
      name: tempUser.name,
      email,
      password: hashedPassword,
      role: "student",
      isVerified: true
    });

    tempUsers.delete(email);

    res.redirect("/login");

  } catch (err) {
    console.log(err);
    res.send("OTP verification failed");
  }
};