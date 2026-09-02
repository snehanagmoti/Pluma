const Notification = require("../models/Notification");

const createNotification = async ({ recipient, actor, type, text, link = "", entityId = null }) => {
  if (!recipient || (actor && recipient.toString() === actor.toString())) return null;
  try {
    return await Notification.create({ recipient, actor, type, text, link, entityId });
  } catch (error) {
    console.error("Notification creation failed:", error.message);
    return null;
  }
};

const createNotifications = async ({ recipients = [], actor, type, text, link = "", entityId = null }) => {
  const uniqueRecipients = [...new Set(recipients.map(recipient => recipient?.toString()).filter(Boolean))]
    .filter(recipient => !actor || recipient !== actor.toString())
    .slice(0, 500);
  if (uniqueRecipients.length === 0) return [];
  try {
    return await Notification.insertMany(uniqueRecipients.map(recipient => ({
      recipient,
      actor,
      type,
      text,
      link,
      entityId,
    })));
  } catch (error) {
    console.error("Bulk notification creation failed:", error.message);
    return [];
  }
};

module.exports = { createNotification, createNotifications };
