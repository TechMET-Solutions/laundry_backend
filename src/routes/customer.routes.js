const express = require("express");
const router = express.Router();

const {
    createCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
} = require("../controllers/customer.controller");

// CREATE
router.post("/create", createCustomer);

// GET ALL
router.get("/list", getAllCustomers);

// GET BY ID
router.get("/list/:id", getCustomerById);

// UPDATE
router.put("/update/:id", updateCustomer);

// DELETE
router.delete("/delete/:id", deleteCustomer);

module.exports = router;
