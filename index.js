
const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./config/database");
const app = express();
app.use(cors()); // cross origin resource sharing
app.use(express.json());
const path = require("path");

// Routes
const authRoutes = require("./src/routes/auth.routes");
const employeeRoutes = require("./src/routes/employee.routes");
const customerRoutes = require("./src/routes/customer.routes");
const serviceRoutes = require("./src/routes/service.routes");
const collectionRoutes = require("./src/routes/collection.routes");
const expensesRoutes = require("./src/routes/expenses.routes");

const locationRoutes = require("./src/routes/locationManagement.routes");
const areaRoutes = require("./src/routes/area.routes");
const timeslotRoutes = require("./src/routes/timeslot.routes");

const serviceLisetRoutes = require("./src/routes/servicelist.routes");
const orderRoutes = require("./src/routes/order.routes");
const reportsRoutes = require("./src/routes/report.routes");
const requireAuth = require("./src/middleware/requireAuth");





app.get("/", (req, res) => {
    res.send("✅ Laundry POS System Backend Server Running...");
});

// Image Path
app.use('/uploads', express.static('uploads'));

// 🔐 Protect all API routes except login
// app.use("/api", (req, res, next) => {
//     const openPaths = ["/employees/login"];
//     if (openPaths.includes(req.path)) return next();
//     return requireAuth(req, res, next);
// });

app.use("/api/employees", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/service_list", serviceLisetRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/timeslot", timeslotRoutes);
app.use("/api/expenses", require("./src/routes/expenses.routes"));
app.use("/api/location_management/emirates", locationRoutes);
app.use("/api/areas", areaRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reports", reportsRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});