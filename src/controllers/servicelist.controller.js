const db = require("../../config/database");
const fs = require("fs");
const path = require("path");



// CREATE Service List
exports.createServiceList = async (req, res) => {
    try {
        const { name, category, services, sorting_order, sqf_status, status = 1 } = req.body;
        const addIcon = req.file ? req.file.filename : null;

        // Validation Fix: sorting_order and sqf_status can be 0, so we check for undefined/null
        if (!name || !category || !services || !addIcon || sorting_order === undefined || sqf_status === undefined) {
            return res.status(400).json({
                success: false,
                message: "All fields including image are required",
            });
        }

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS services (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                addIcon VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                sorting_order INT DEFAULT 0,
                sqf_status TINYINT(1) DEFAULT 0,
                service_types JSON NOT NULL,
                status TINYINT(1) DEFAULT 1,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await db.query(createTableSQL);

        // Ensure services is stored as a valid JSON string
        // If frontend sends it as a string, keep it, if object, stringify it.
        const serviceTypesJson = typeof services === 'string' ? services : JSON.stringify(services);

        const insertSQL = `
            INSERT INTO services (name, addIcon, category, service_types, sorting_order, sqf_status, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(insertSQL, [
            name.trim(),
            addIcon,
            category.trim(),
            serviceTypesJson,
            sorting_order,
            sqf_status,
            status,
        ]);

        res.status(201).json({
            success: true,
            message: "Service created successfully",
            data: { id: result.insertId, name, category }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// UPDATE Service List
exports.updateServiceList = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, services, sorting_order, sqf_status, status } = req.body;
        const newIcon = req.file ? req.file.filename : null;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service List ID is required",
            });
        }

        // Pehle existing record nikaalo
        const [rows] = await db.query("SELECT addIcon FROM services WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service List not found",
            });
        }

        const oldIcon = rows[0].addIcon;

        // Agar naya image aaya hai to purana delete karo
        if (newIcon && oldIcon) {
            const oldPath = path.join(__dirname, "../../uploads/", oldIcon);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        let serviceTypesJson = null;
        if (services) {
            serviceTypesJson = typeof services === "string" ? services : JSON.stringify(services);
        }

        const updateSQL = `
          UPDATE services
          SET 
            name = COALESCE(?, name),
            addIcon = COALESCE(?, addIcon),
            category = COALESCE(?, category),
            service_types = COALESCE(?, service_types),
            sorting_order = COALESCE(?, sorting_order),
            sqf_status = COALESCE(?, sqf_status),
            status = COALESCE(?, status)
          WHERE id = ?
        `;

        await db.query(updateSQL, [
            name?.trim() || null,
            newIcon || null,
            category?.trim() || null,
            serviceTypesJson,
            sorting_order ?? null,
            sqf_status ?? null,
            status ?? null,
            id,
        ]);

        res.json({
            success: true,
            message: "Service List updated successfully",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// GET Service List
exports.getServiceList = async (req, res) => {
    try {
        // Create table if not exists
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS services (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                addIcon VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                sorting_order INT DEFAULT 0,
                sqf_status TINYINT(1) DEFAULT 0,
                service_types JSON NOT NULL,
                status TINYINT(1) DEFAULT 1,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await db.query(createTableSQL);

        // Query results sorted by ID
        const [rows] = await db.query("SELECT * FROM services ORDER BY id ASC");

        // Map through rows to parse the service_types JSON string back into an object/array
        const formattedRows = rows.map(row => ({
            ...row,
            service_types: typeof row.service_types === 'string'
                ? JSON.parse(row.service_types)
                : row.service_types
        }));

        res.json({
            success: true,
            data: formattedRows,
        });
    } catch (err) {
        console.error("Get Service List Error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch service list",
            error: err.message,
        });
    }
};

// DELETE Service List
exports.deleteServiceList = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service List ID is required",
            });
        }

        // Pehle image ka naam nikaalo
        const [rows] = await db.query("SELECT addIcon FROM services WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service List not found",
            });
        }

        const icon = rows[0].addIcon;

        // DB se delete
        await db.query("DELETE FROM services WHERE id = ?", [id]);

        // Server se image delete
        if (icon) {
            const imgPath = path.join(__dirname, "../../uploads/", icon);
            if (fs.existsSync(imgPath)) {
                fs.unlinkSync(imgPath);
            }
        }

        res.json({
            success: true,
            message: "Service List deleted successfully",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

