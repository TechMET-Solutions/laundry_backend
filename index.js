const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./config/database");
const app = express();
app.use(cors());
app.use(express.json());
const path = require("path");

// Routes
const employeeRoutes = require("./src/routes/employee.routes");
const customerRoutes = require("./src/routes/customer.routes");
const serviceRoutes = require("./src/routes/service.routes");
const collectionRoutes = require("./src/routes/collection.routes");
const expensesRoutes = require("./src/routes/expenses.routes");
 
const locationRoutes = require("./src/routes/locationManagement.routes");
const timeslotRoutes = require("./src/routes/timeslot.routes");
 
 
 
 


app.get("/", (req, res) => {
    res.send("✅ Laundry POS System Backend Server Running...");
});

// app.use("/assets", express.static(path.join(__dirname, "src/assets")));
// app.use("/uploads", express.static(path.join(__dirname, "./uploads")));

app.use("/api/employees", employeeRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/timeslot", timeslotRoutes);
app.use("/api/expenses", require("./src/routes/expenses.routes"));
app.use("/api/location_management", locationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});