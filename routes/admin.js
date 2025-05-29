const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const isAuth = require("../middleware/is-auth");
const { check, body } = require("express-validator");

//routing
router.get("/add-product", isAuth, adminController.getAddProduct);
router.get("/products", isAuth, adminController.getProducts);
router.post(
  "/add-product",
  [
    body("title")
      .isString()
      .isLength({ min: 3 })
      .withMessage("Title must have at least 3 charatcters")
      .trim(),
    body("price")
      .isFloat()
      .withMessage("Price is required. Only numbers are allowed"),
    body("description")
      .isLength({ min: 5, max: 400 })
      .withMessage("Description must have a min of 3 characters and max of 400")
      .trim(),
  ],
  isAuth,
  adminController.postAddProducts
);
router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);
router.post(
  "/edit-product",
  [
    body("title")
      .isString()
      .isLength({ min: 3 })
      .withMessage("Title must have at least 3 charatcters")
      .trim(),
    body("price")
      .isFloat()
      .withMessage("Price is required. Only numbers are allowed"),
    body("description")
      .isLength({ min: 5, max: 400 })
      .withMessage("Description must have a min of 3 characters and max of 400")
      .trim(),
  ],
  isAuth,
  adminController.postEditProduct
);
router.delete("/product/:productId", isAuth, adminController.deleteProduct);

module.exports = router;
