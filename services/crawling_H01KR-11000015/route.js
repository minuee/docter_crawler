const express = require('express');
const asyncify = require('express-asyncify');
const router = asyncify(express.Router());
const controller = require('./controller');

// This route can be used to test the parser directly.
router.get('/test', async (req, res) => {
  // TODO: Add test logic here if needed.
  // For example, call controller.crawlDoctorProfile with sample data.
  res.send("This is a test route for the H01KR-11000015 parser.");
});

module.exports = router;