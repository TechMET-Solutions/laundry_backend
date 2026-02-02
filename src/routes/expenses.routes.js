const express = require("express");
const router = express.Router();

const {
    createExpenses,
    getAllExpenses,
    getExpensesById,
    updateExpenses,
    deleteExpenses,
    createExpenseCategory,
    getAllExpenseCategories,
    getExpenseCategoryById,
    updateExpenseCategory,
    deleteExpenseCategory,
    getExpensesReport,
} = require("../controllers/expenses.controller");


// CREATE
router.post("/create", createExpenses);
router.get("/list", getAllExpenses);
router.get("/list/:id", getExpensesById);
router.put("/update/:id", updateExpenses);
router.delete("/delete/:id", deleteExpenses);

//API of Expense category
router.post("/category/create",createExpenseCategory);  
router.get("/category/list",getAllExpenseCategories);
router.get("/category/list/:id",getExpenseCategoryById);
router.put("/category/update/:id",updateExpenseCategory);
router.delete("/category/delete/:id", deleteExpenseCategory);

// Report
router.get("/report", getExpensesReport);


module.exports = router;
