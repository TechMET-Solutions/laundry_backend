const express = require("express");
const router = express.Router();

const {
    createExpenses,
    getAllExpenses,
    getExpensesById,
    updateExpenses,
    deleteExpenses,
} = require("../controllers/expenses.controller");
// CREATE
router.post("/create", createExpenses);

// GET ALL
router.get("/list", getAllExpenses);

// GET BY ID
router.get("/list/:id", getExpensesById);

// UPDATE
router.put("/update/:id", updateExpenses);

// DELETE
router.delete("/delete/:id", deleteExpenses);

module.exports = router;
