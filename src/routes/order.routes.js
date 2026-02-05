const express = require("express");
const router = express.Router();

const {
  createOrder,
  getOrders,
  getOrderById, 
  softDelete,
  hardDelete,
  addPayment,
  revokeOrder,
  updateDriver,
  updateOrder,
} = require("../controllers/order.controller");

router.post("/create", createOrder);
router.post("/addpayment", addPayment);
router.get("/list", getOrders);
router.get("/list/:id", getOrderById);
router.put("/update/:id", softDelete);
router.put("/updateorder/:id", updateOrder);
router.put("/revoke/:id/", revokeOrder);
router.put("/updatedriver/:id", updateDriver);
router.delete("/delete/:id", hardDelete);

module.exports = router;
