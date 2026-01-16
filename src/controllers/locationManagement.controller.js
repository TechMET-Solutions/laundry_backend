const db = require("../../config/database");

// ==================== EMIRATES MANAGEMENT ====================

// CREATE Emirates (with auto table creation)
exports.createEmirate = async (req, res) => {
  try {
    const { emirate, code, country, status = 1 } = req.body;

    // Validation
    // if (!emirate || !code || !country) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Emirate, code, and country are required",
    //   });
    // }

    // Auto-create table
    const createTableSQL = `
            CREATE TABLE IF NOT EXISTS emirates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                emirate VARCHAR(100) NOT NULL,
                code VARCHAR(50) NOT NULL UNIQUE,
                country VARCHAR(100) NOT NULL,
                status TINYINT(1) DEFAULT 1,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;

    await db.query(createTableSQL);

    

    // Insert Emirates
    const insertSQL = `
            INSERT INTO emirates (emirate, code, country, status)
            VALUES (?, ?, ?, ?)
        `;

    const [result] = await db.query(insertSQL, [
      emirate.trim(),
      code.trim(),
      country.trim(),
      status,
    ]);

    res.status(201).json({
      success: true,
      message: "Emirate created successfully",
      data: {
        id: result.insertId,  // it create the emirate and returns the unique id
        emirate,
        code,
        country,
        status,
      },
    });
  } catch (err) {
    console.error("Create Emirate Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create emirate",
      error: err.message,
    });
  }
};

// GET All Emirates
exports.getAllEmirates = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM emirates ORDER BY emirate ASC`
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("Get All Emirates Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch emirates",
      error: err.message,
    });
  }
};

// GET Emirates By ID
exports.getEmirateById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Emirate ID is required",
      });
    }

    const [rows] = await db.query(
      `SELECT * FROM emirates WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Emirate not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error("Get Emirate By ID Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch emirate",
      error: err.message,
    });
  }
};

// UPDATE Emirates
exports.updateEmirate = async (req, res) => {
  try {
    const { id } = req.params;
    const { emirate, code, country, status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Emirate ID is required",
      });
    }

    // Check if emirate exists
    const [existing] = await db.query(
      `SELECT id FROM emirates WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Emirate not found",
      });
    }

    

    const updateSQL = `
            UPDATE emirates
            SET 
                emirate = COALESCE(?, emirate),
                code = COALESCE(?, code),
                country = COALESCE(?, country),
                status = COALESCE(?, status)
            WHERE id = ?
        `;

    await db.query(updateSQL, [
      emirate?.trim() || null,
      code?.trim() || null,
      country?.trim() || null,
      status !== undefined ? status : null,
      id,
    ]);

    res.json({
      success: true,
      message: "Emirate updated successfully",
    });
  } catch (err) {
    console.error("Update Emirate Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update emirate",
      error: err.message,
    });
  }
};

// DELETE Emirates
exports.deleteEmirate = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Emirate ID is required",
      });
    }

   
    
    const [result] = await db.query(
      `DELETE FROM emirates WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Emirate not found",
      });
    }

    res.json({
      success: true,
      message: "Emirate deleted successfully",
    });
  } catch (err) {
    console.error("Delete Emirate Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete emirate",
      error: err.message,
    });
  }
};

// ==================== AREAS MANAGEMENT ====================

// CREATE Area (with auto table creation)
exports.createArea = async (req, res) => {
  try {
    const { area, code, country, emirate_id, status = 1 } = req.body;

    if (!area || !code || !country || !emirate_id) {
      return res.status(400).json({
        success: false,
        message: "Area, code, country, and emirate_id are required",
      });
    }


    // code is UNIQUE 
    // Auto-create table (NO foreign key)
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS areas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        area VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE, 
        country VARCHAR(100) NOT NULL,
        emirate_id INT NOT NULL,
        status TINYINT(1) DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP
      )
    `;

    await db.query(createTableSQL);

    const insertSQL = `
      INSERT INTO areas (area, code, country, emirate_id, status)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSQL, [
      area.trim(),
      code.trim(),
      country.trim(),
      emirate_id,
      status,
    ]);

    res.status(201).json({
      success: true,
      message: "Area created successfully",
      data: {
        id: result.insertId,
        area,
        code,
        country,
        emirate_id,
        status,
      },
    });
  } catch (err) {
    console.error("Create Area Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create area",
      error: err.message,
    });
  }
};


// GET All Areas (with Emirates details)
exports.getAllAreas = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM areas ORDER BY area ASC`
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("Get All Areas Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch areas",
      error: err.message,
    });
  }
};


// GET Areas By ID
exports.getAreaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM areas WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error("Get Area By ID Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch area",
      error: err.message,
    });
  }
};


exports.updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { area, code, country, emirate_id, status } = req.body;

    const [existing] = await db.query(
      `SELECT id FROM areas WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    const updateSQL = `
      UPDATE areas SET
        area = COALESCE(?, area),
        code = COALESCE(?, code),
        country = COALESCE(?, country),
        emirate_id = COALESCE(?, emirate_id),
        status = COALESCE(?, status)
      WHERE id = ?
    `;

    await db.query(updateSQL, [
      area?.trim() || null,
      code?.trim() || null,
      country?.trim() || null,
      emirate_id || null,
      status !== undefined ? status : null,
      id,
    ]);

    res.json({
      success: true,
      message: "Area updated successfully",
    });
  } catch (err) {
    console.error("Update Area Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update area",
      error: err.message,
    });
  }
};


// DELETE Area
exports.deleteArea = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `DELETE FROM areas WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    res.json({
      success: true,
      message: "Area deleted successfully",
    });
  } catch (err) {
    console.error("Delete Area Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete area",
      error: err.message,
    });
  }
};

