const db = require("../../config/database");


exports.createServiceList = async (req, res) => {

  try {
        const { name, category, type, price, status = 1 } = req.body;
        const addIcon = req.file ? req.file.filename : null;

        // Validate required fields
        if (!name || !category || !type || !price || !addIcon) {
            return res.status(400).json({
                success: false,
                message: "All fields including image are required",
            });
        }

        // Auto-create table
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        addIcon VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        type VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        status TINYINT(1) DEFAULT 1, -- 0 = inactive, 1 = active
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await db.query(createTableSQL);

        // Insert Service Type
        const insertSQL = `
      INSERT INTO services (name, addIcon, category, type, price, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

        const [result] = await db.query(insertSQL, [
            name.trim(),
            addIcon,
            category.trim(),
            type.trim(),
            price,
            status,
        ]);

        res.status(201).json({
            success: true,
            message: "Service Type created successfully",
            data: {
                id: result.insertId,
                name, 
                addIcon,
                category,
                type,
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
  
    }


    exports.getServiceList = async (req, res) => {
      try {
    const [rows] = await db.query("SELECT * FROM services ORDER BY id ASC");
    res.json({
      success: true,
      data: rows,
    });
    } catch (err) {
    console.error("Get Service List Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch service list",
      error: err.message,
    });
  }
}


// UPDATE Service List
exports.updateServiceList = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, type, price, status } = req.body;
        const addIcon = req.file ? req.file.filename : null;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Service List ID is required",
            });
        }

        const updateSQL = `
      UPDATE services
      SET 
        name = COALESCE(?, name),
        addIcon = COALESCE(?, addIcon),
        category = COALESCE(?, category),
        type = COALESCE(?, type),
        price = COALESCE(?, price),
        status = COALESCE(?, status)
      WHERE id = ?
    `;

        const [result] = await db.query(updateSQL, [
            name?.trim() || null,
            addIcon || null,
            category?.trim() || null,
            type?.trim() || null,
            price ?? null,
            status ?? null,
            id,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Service List not found",
            });
        }

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

        const deleteSQL = `DELETE FROM services WHERE id = ?`;
        const [result] = await db.query(deleteSQL, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Service List not found",
            });
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

