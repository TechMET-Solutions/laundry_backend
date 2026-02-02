const db = require("../../config/database");
const fs = require('fs').promises; // Use promises for cleaner async/await
const path = require('path');

const deleteFile = async (relativePath) => {
    if (!relativePath) return;
    try {
        // Adjusting path: assumes this controller is in /controllers/subfolder/
        const fullPath = path.join(__dirname, '..', '..', relativePath);
        await fs.unlink(fullPath);
    } catch (err) {
        console.error(`File deletion failed or file not found: ${relativePath}`);
    }
};

// CREATE Service Type (AUTO CREATE TABLE + INSERT)
exports.createServiceType = async (req, res) => {
    try {
        // Added 'image' to destructuring
        const { name, abbreviation, image, status = 1 } = req.body;

        if (!name || !abbreviation) {
            return res.status(400).json({
                success: false,
                message: "Name and abbreviation are required",
            });
        }

        // 1. Auto-create/Update table (Added image column)
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS service_type (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                abbreviation VARCHAR(100) NOT NULL,
                image VARCHAR(255) DEFAULT NULL, -- Added image field
                status TINYINT(1) DEFAULT 1,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await db.query(createTableSQL);

        // 2. Insert Service Type (Updated to include image)
        const insertSQL = `
            INSERT INTO service_type (name, abbreviation, image, status)
            VALUES (?, ?, ?, ?)
        `;

        // Inside createServiceType
        const imagePath = req.file ? `uploads/servicesTypes/${req.file.filename}` : null;

        const [result] = await db.query(insertSQL, [
            name.trim(),
            abbreviation.trim(),
            imagePath, // Save the generated path
            status,
        ]);

        res.status(201).json({
            success: true,
            message: "Service Type created successfully",
            data: {
                id: result.insertId,
                name,
                abbreviation,
                image: imagePath,
                status,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};


// UPDATE Service Type
exports.updateServiceType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, abbreviation, status } = req.body;
        let imagePath = req.file ? `uploads/servicesTypes/${req.file.filename}` : undefined;

        if (imagePath) {
            const [rows] = await db.query(`SELECT image FROM service_type WHERE id = ?`, [id]);
            if (rows.length > 0) await deleteFile(rows[0].image);
        }

        const updateSQL = `
            UPDATE service_type SET 
            name = COALESCE(?, name), 
            abbreviation = COALESCE(?, abbreviation), 
            image = COALESCE(?, image), 
            status = COALESCE(?, status) 
            WHERE id = ?`;

        const [result] = await db.query(updateSQL, [name?.trim() || null, abbreviation?.trim() || null, imagePath || null, status ?? null, id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Not found" });

        // Get updated data
        const [updatedRows] = await db.query(`SELECT * FROM service_type WHERE id = ?`, [id]);

        res.json({ 
            success: true, 
            message: "Updated successfully",
            data: updatedRows[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


// DELETE Service Type
exports.deleteServiceType = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`SELECT image FROM service_type WHERE id = ?`, [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found" });

        await deleteFile(rows[0].image);
        await db.query(`DELETE FROM service_type WHERE id = ?`, [id]);

        res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}


// GET All Service Types
exports.getAllServiceTypes = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM service_type ORDER BY id DESC`);

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

// GET Service Type By ID
exports.getServiceTypeById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service Type ID is required",
            });
        }

        const [rows] = await db.query(
            `SELECT * FROM service_type WHERE id = ? LIMIT 1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service Type not found",
            });
        }

        res.json({
            success: true,
            data: rows[0],
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};





// = = = = =  Service Category Controllers = = = = = //

exports.createServiceCategory = async (req, res) => {
    try {
        const { name, color_code, status = 1 } = req.body;

        if (!name || !color_code) {
            return res.status(400).json({
                success: false,
                message: "Name and color code are required",
            });
        }

        // Auto-create table
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS service_category (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        color_code VARCHAR(100) NOT NULL,
        status TINYINT(1) DEFAULT 1, -- 0 = inactive, 1 = active
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await db.query(createTableSQL);

        // Insert Service Category
        const insertSQL = `
      INSERT INTO service_category (name, color_code, status)
      VALUES (?, ?, ?)
    `;

        const [result] = await db.query(insertSQL, [
            name.trim(),
            color_code.trim(),
            status,
        ]);

        res.status(201).json({
            success: true,
            message: "Service Category created successfully",
            data: {
                id: result.insertId,
                name,
                color_code,
                status,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};


// UPDATE Service Category
exports.updateServiceCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color_code, status } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service Category ID is required",
            });
        }

        const updateSQL = `
      UPDATE service_category
      SET 
        name = COALESCE(?, name),
        color_code = COALESCE(?, color_code),
        status = COALESCE(?, status)
      WHERE id = ?
    `;

        const [result] = await db.query(updateSQL, [
            name?.trim() || null,
            color_code?.trim() || null,
            status ?? null,
            id,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Service Category not found",
            });
        }

        res.json({
            success: true,
            message: "Service Category updated successfully",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// DELETE Service Category
exports.deleteServiceCategory = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service Category ID is required",
            });
        }

        const deleteSQL = `DELETE FROM service_category WHERE id = ?`;
        const [result] = await db.query(deleteSQL, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Service Category not found",
            });
        }

        res.json({
            success: true,
            message: "Service Category deleted successfully",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// GET All Service Category
exports.getAllServiceCategory = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM service_category ORDER BY id DESC`);

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

// GET Service Category By ID
exports.getServiceCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service Category ID is required",
            });
        }

        const [rows] = await db.query(
            `SELECT * FROM service_category WHERE id = ? LIMIT 1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service Category not found",
            });
        }

        res.json({
            success: true,
            data: rows[0],
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};


// = = = = =  Service Addon Controllers = = = = = //

exports.createServiceAddon = async (req, res) => {
    try {
        const { name, price,status = 1 } = req.body;

        if (!name || !price) {
            return res.status(400).json({
                success: false,
                message: "Name and price are required",
            });
        }

        // Auto-create table
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS service_addon (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DOUBLE(10, 2) NOT NULL,
        status TINYINT(1) DEFAULT 1, -- 0 = inactive, 1 = active
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await db.query(createTableSQL);

        // Insert Service Addon
        const insertSQL = `
      INSERT INTO service_addon (name, price,status)
      VALUES (?, ?, ?)
    `;

        const [result] = await db.query(insertSQL, [
            name.trim(),
            price.trim(),
            status,
        ]);

        res.status(201).json({
            success: true,
            message: "Service Addon created successfully",
            data: {
                id: result.insertId,
                name,
                price,
                status,
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};


// GET All Service addon
exports.getAllServiceaddon = async (req, res) => {
    try {
        // Ensure table exists first
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS service_addon (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                price DOUBLE(10, 2) NOT NULL,
                status TINYINT(1) DEFAULT 1,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await db.query(createTableSQL);

        const [rows] = await db.query(`SELECT * FROM service_addon ORDER BY id DESC`);

        res.json({
            success: true,
            data: rows,
        });
    } catch (err) {
        console.error("getAllServiceaddon error:", err);
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// GET Service addon By ID
exports.getServiceAddonById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service Addon ID is required",
            });
        }

        const [rows] = await db.query(
            `SELECT * FROM service_addon WHERE id = ? LIMIT 1`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Service Addon not found",
            });
        }

        res.json({
            success: true,
            data: rows[0],
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// UPDATE Service addon
exports.updateServiceaddon = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service addon ID is required",
            });
        }

        const updateSQL = `
      UPDATE service_addon
      SET 
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        status = COALESCE(?, status)
      WHERE id = ?
    `;

        const [result] = await db.query(updateSQL, [
            name?.trim() || null,
            price?.trim() || null,
            status ?? null,
            id,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Service addon not found",
            });
        }

        res.json({
            success: true,
            message: "Service addon updated successfully",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

// DELETE Service addon
exports.deleteServiceAddon = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service addon ID is required",
            });
        }

        const deleteSQL = `DELETE FROM service_addon WHERE id = ?`;
        const [result] = await db.query(deleteSQL, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Service Addon not found",
            });
        }

        res.json({
            success: true,
            message: "Service addon deleted successfully",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};