const Notification = require("../models/Notification");


const sendNotification = async (userId, message, io) => {
  try {
    // save in DB
    const newNotification = await Notification.create({
      user: userId,
      message
    });

    if (io) {
      io.to(userId.toString()).emit("newNotification", {
        message,
        createdAt: newNotification.createdAt
      });
    }

  } catch (err) {
    console.log("Notification error:", err);
  }
};

module.exports = sendNotification;