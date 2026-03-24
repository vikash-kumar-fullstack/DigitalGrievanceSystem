const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendOtp = require("../utils/sendOtp");
const tempUsers = new Map();
// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const currentYear = new Date().getFullYear() % 100;

    const allowedYears = [
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3
    ]
      .map(y => y.toString().padStart(2, "0"))
      .join("|");

    const emailRegex = new RegExp(
      `^(bt|mt)(${allowedYears})(cs|ec|ee|me|ma|ce)(\\d{3})@nitmz\\.ac\\.in$`
    );

    // 🔥 Single validation using match
    const match = email.match(emailRegex);

    if (!match) {
      return res.render("register", {
        error: "Enter valid institute email",
        oldData: { name, email }
      });
    }

    const roll = parseInt(match[4]);

    if (roll > 200) {
      return res.render("register", {
        error: "Invalid roll number",
        oldData: { name, email }
      });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.render("register", {
        error: "User already exists",
        oldData: { name, email }
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    tempUsers.set(email, {
      name,
      password,
      otp,
      createdAt: Date.now()
    });

    try {
      await sendOtp(email, otp);
    } catch (mailErr) {
      console.log("MAIL ERROR:", mailErr);

      tempUsers.delete(email);

      return res.render("register", {
        error: "Invalid institute email or email does not exist",
        oldData: { name, email }
      });
    }

    return res.render("verify-otp", {
      email,
      message: "OTP sent successfully"
    });

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

exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const tempUser = tempUsers.get(email);

    if (!tempUser) {
      return res.render("register", {
        error: "Session expired. Please register again.",
        oldData: null
      });
    }

    if (Date.now() - tempUser.createdAt < 30000) {
      return res.render("verify-otp", {
        email,
        error: "Please wait 30 seconds before requesting a new OTP"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    tempUsers.set(email, {
      ...tempUser,
      otp,
      createdAt: Date.now()
    });

    await sendOtp(email, otp);

    return res.render("verify-otp", {
      email,
      message: "A new OTP has been sent to your email"
    });

  } catch (err) {
    console.log("RESEND OTP ERROR:", err);

    return res.render("verify-otp", {
      email: req.body.email,
      error: "Something went wrong. Please try again."
    });
  }
};