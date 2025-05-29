const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { check, body } = require("express-validator");

//routing
router.get("/login", authController.getLogin);
router.post(
  "/login",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 5 })
      .withMessage("Password must be at least 5 characters long")
      .trim(),
  ],
  authController.postLogin
);
router.post("/logout", authController.postLogout);
router.get("/signup", authController.getSignup);
router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("password", "Password must be at least 5 characters long")
      .isLength({ min: 5 })
      .trim(),
  ],
  authController.postSignup
);

module.exports = router;
