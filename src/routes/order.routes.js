const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders,
  getOrderById, 
  softDelete,
  hardDelete,
  addPayment,
} = require("../controllers/order.controller");

router.post("/create", createOrder);
router.post("/addpayment", addPayment);
router.get("/list", getOrders);
router.get("/list/:id", getOrderById);
router.put("/update/:id", softDelete);
router.delete("/delete/:id", hardDelete);

module.exports = router;
