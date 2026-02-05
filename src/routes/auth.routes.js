const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

// ✅ Login endpoint
router.post("/login", authController.login);

// ✅ Get current user (protected route)
router.get("/me", authController.getCurrentUser);

// ‍💼 SUPERVISOR - Get employees (only Supervisor and Admin can access)
router.get("/supervisor/employees", authController.checkRole(["Supervisor", "Admin"]), authController.getEmployeesForSupervisor);

// 🔐 ADMIN - Get all employees with pagination
router.get("/admin/employees", authController.checkRole(["Admin"]), authController.getAllEmployeesForAdmin);

module.exports = router;
