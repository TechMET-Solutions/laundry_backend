const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
} = require("../controllers/order.controller");

router.post("/create", createOrder);
router.get("/list", getOrders);
router.get("/list/:id", getOrderById);
router.put("/update/:id", updateOrder);
router.delete("/delete/:id", deleteOrder);

module.exports = router;
