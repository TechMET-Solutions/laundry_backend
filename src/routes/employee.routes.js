const express = require("express");
const {
    createEmployee,
    getAllEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee
} = require("../controllers/employee.controller");
const router = express.Router();


// CREATE
router.post("/create", createEmployee);

// GET ALL
router.get("/list", getAllEmployees);

// GET BY ID
router.get("/list/:id", getEmployeeById);

// UPDATE
router.put("/update/:id", updateEmployee);

// DELETE
router.delete("/delete/:id", deleteEmployee);

module.exports = router;
