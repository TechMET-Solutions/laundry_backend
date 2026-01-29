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

//API of Expense category
const{
    createExpenseCategory,
    getAllExpenseCategories,
    getExpenseCategoryById,
    updateExpenseCategory,
    deleteExpenseCategory,
}=require("../controllers/expenses.controller");
//create category
router.post("/category/create",createExpenseCategory);  

//get all category
router.get("/category/list",getAllExpenseCategories);

//get category by id
router.get("/category/list/:id",getExpenseCategoryById);

//update category
router.put("/category/update/:id",updateExpenseCategory);

//delete category
router.delete("/category/delete/:id",deleteExpenseCategory);

module.exports = router;
