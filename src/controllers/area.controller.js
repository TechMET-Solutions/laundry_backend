const db = require("../../config/database");

// ==================== CREATE AREA ====================
exports.createArea = async (req, res) => {
  try {
    const { area, emirates, radius, country, status = 1 } = req.body;

    if (!area || !emirates || !radius || !country) {
      return res.status(400).json({
        success: false,
        message: "area, emirates, radius, and country are required",
      });
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS areas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        area VARCHAR(100) NOT NULL,
        emirates VARCHAR(100) NOT NULL,
        radius VARCHAR(50) NOT NULL,
        country VARCHAR(100) NOT NULL,
        status TINYINT(1) DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await db.query(createTableSQL);

    const insertSQL = `
      INSERT INTO areas (area, emirates, radius, country, status)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(insertSQL, [
      area.trim(),
      emirates.trim(),
      radius.trim(),
      country.trim(),
      status,
    ]);

    res.status(201).json({
      success: true,
      message: "Area created successfully",
      data: { id: result.insertId },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to create area",
      error: err.message,
    });
  }
};

// ==================== GET ALL AREAS ====================
exports.getAllAreas = async (req, res) => {
  try {

 const createTableSQL = `
      CREATE TABLE IF NOT EXISTS areas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        area VARCHAR(100) NOT NULL,
        emirates VARCHAR(100) NOT NULL,
        radius VARCHAR(50) NOT NULL,
        country VARCHAR(100) NOT NULL,
        status TINYINT(1) DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await db.query(createTableSQL);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM areas"
    );

    const [rows] = await db.query(
      `
      SELECT *
      FROM areas
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
      [limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch areas",
      error: err.message,
    });
  }
};

// ==================== GET AREA BY ID ====================
exports.getAreaById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM areas WHERE id = ?",
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch area",
      error: err.message,
    });
  }
};

// ==================== UPDATE AREA ====================
exports.updateArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { area, emirates, radius, country, status } = req.body;

    const [existing] = await db.query(
      "SELECT id FROM areas WHERE id = ?",
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
        emirates = COALESCE(?, emirates),
        radius = COALESCE(?, radius),
        country = COALESCE(?, country),
        status = COALESCE(?, status)
      WHERE id = ?
    `;

    await db.query(updateSQL, [
      area?.trim() || null,
      emirates?.trim() || null,
      radius?.trim() || null,
      country?.trim() || null,
      status !== undefined ? status : null,
      id,
    ]);

    res.json({
      success: true,
      message: "Area updated successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update area",
      error: err.message,
    });
  }
};

// ==================== DELETE AREA ====================
exports.deleteArea = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM areas WHERE id = ?",
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
    res.status(500).json({
      success: false,
      message: "Failed to delete area",
      error: err.message,
    });
  }
};
