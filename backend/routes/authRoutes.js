const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/auth");
const { authValidators } = require("../middlewares/validators");

const router = express.Router();

// Public routes
router.post("/register", authValidators.register, authController.register);
router.post("/login", authValidators.login, authController.login);
router.get("/logout", authController.logout);

// Protected routes
router.get("/me", protect, authController.getMe);
router.put("/updatedetails", protect, authController.updateDetails);
router.put("/updatepassword", protect, authController.updatePassword);

module.exports = router;
