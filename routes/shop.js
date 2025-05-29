const express = require("express");
const router = express.Router();
const shopController = require("../controllers/shopController");
const isAuth = require("../middleware/is-auth");
const { route } = require("./admin");

router.get("/", shopController.getIndex);
router.get("/products", shopController.getProducts);
router.get("/products/:productId", shopController.getProduct);
router.get("/cart", isAuth, shopController.getCart);
router.post("/cart", isAuth, shopController.postCart);
router.post("/cart-delete-item", isAuth, shopController.postCartDeleteItem);
router.get("/orders", isAuth, shopController.getOrders);
router.get("/orders/:orderId", isAuth, shopController.getInvoice);
router.get("/checkout", isAuth, shopController.getCheckout);
router.get("/checkout/success", isAuth, shopController.postOrder);
router.get("/checkout/cancel", isAuth, shopController.getCheckout);

module.exports = router;
