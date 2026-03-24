const Notification = require("../models/Notification");

const sendNotification = async (userId, message) => {
  try {
    await Notification.create({
      user: userId,
      message
    });
  } catch (err) {
    console.log("Notification error:", err);
  }
};

module.exports = sendNotification;