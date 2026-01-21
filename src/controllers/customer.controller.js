const db = require("../../config/database");

// ✅ CREATE Customer (AUTO CREATE TABLE + INSERT)
exports.createCustomer = async (req, res) => {
    try {
        const {
            name,
            type,
            mobile_no,
            whatsapp_no,
            email,
            emirates,
            area,
            apartment_number,
            building_name,
            map_location,
            tax_number,
            address,
            status,
        } = req.body;

        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS Customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type ENUM('individual','corporate') NOT NULL,
        mobile_no VARCHAR(20) NOT NULL,
        whatsapp_no VARCHAR(20),
        email VARCHAR(100),
        emirates VARCHAR(255) NOT NULL,
        area VARCHAR(255) NOT NULL,
        apartment_number VARCHAR(255) NOT NULL,
        building_name VARCHAR(100),
        map_location VARCHAR(100),
        tax_number VARCHAR(100),
        address VARCHAR(255),
        status TINYINT(1) DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await db.query(createTableSQL);

        const insertSQL = `
      INSERT INTO Customers
      (
        name, type, mobile_no, whatsapp_no, email,
        emirates, area, apartment_number,
        building_name, map_location, tax_number,
        address, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await db.query(insertSQL, [
            name,
            type,
            mobile_no,
            whatsapp_no,
            email,
            emirates,
            area,
            apartment_number,
            building_name,
            map_location,
            tax_number,
            address,
            status,
        ]);

        res.status(201).json({
            success: true,
            message: "Customer created successfully",
            id: result.insertId,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};


// ✅ GET ALL Customers
exports.getAllCustomers = async (req, res) => {
    try {
        const { search = "" } = req.query;

        let sql = `SELECT * FROM Customers`;
        let values = [];

        if (search.trim()) {
            sql += ` WHERE name LIKE ?`;
            values.push(`%${search}%`);
        }

        sql += ` ORDER BY id DESC`;

        const [rows] = await db.query(sql, values);

        res.json({
            success: true,
            data: rows,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};


// ✅ GET Customer BY ID
exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(`SELECT * FROM Customers WHERE id = ?`, [id]);

        if (!rows.length) {
            return res
                .status(404)
                .json({ success: false, message: "Customer not found" });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ✅ UPDATE Customer
exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            type,
            mobile_no,
            whatsapp_no,
            email,
            emirates,
            area,
            apartment_number,
            building_name,
            map_location,
            tax_number,
            address,
            status,
        } = req.body;

        const updateSQL = `
      UPDATE Customers SET
        name = ?,
        type = ?,
        mobile_no = ?,
        whatsapp_no = ?,
        email = ?,
        emirates = ?,
        area = ?,
        apartment_number = ?,
        building_name = ?,
        map_location = ?,
        tax_number = ?,
        address = ?,
        status = ?
      WHERE id = ?
    `;

        const [result] = await db.query(updateSQL, [
            name,
            type,
            mobile_no,
            whatsapp_no,
            email,
            emirates,
            area,
            apartment_number,
            building_name,
            map_location,
            tax_number,
            address,
            status,
            id,
        ]);

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Customer not found" });
        }

        res.json({ success: true, message: "Customer updated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ✅ DELETE Customer
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(`DELETE FROM Customers WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Customer not found" });
        }

        res.json({ success: true, message: "Customer deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
