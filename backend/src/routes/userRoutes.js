const express = require('express');
const router = express.Router();

// 1. Import the middleware
const { verifyToken } = require('../middleware/auth');

// Import the controller we just created
const userController = require('../controllers/userController');

// 2. Add 'verifyToken' before the controller
// Definition: When a GET request comes to '/', check token first, then run getUsers
router.get('/', verifyToken, userController.getUsers);

// Export the router to be used in index.js
module.exports = router;