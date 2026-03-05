const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URL).then(async () => {
    console.log("🧨 Dropping Database...");
    await mongoose.connection.db.dropDatabase();
    console.log("✅ Database Wiped Clean.");
    process.exit();
});