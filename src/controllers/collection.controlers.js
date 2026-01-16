const db = require("../../../laundry_backend/config/database");

/**
 * CREATE COLLECTION
 */
exports.createCollection = async (req, res) => {
  try {
    const {
      collection_type,
      customer_id,
      customer_type,
      pickup_date,
      time_slot,
      phone_number,
      driver_id,
      comments,
    } = req.body;
    
            const createTableSQL=`
                CREATE TABLE IF NOT EXISTS collections(
            id INT AUTO_INCREMENT PRIMARY KEY,
            collection_code VARCHAR(30) NOT NULL UNIQUE,
            collection_type ENUM('CLOTH', 'PAYMENT') NOT NULL,
            customer_id INT NOT NULL,
            customer_type VARCHAR(50) NULL,
            pickup_date DATE NOT NULL,
            time_slot VARCHAR(50) NOT NULL,
            phone_number VARCHAR(20) NOT NULL,
            driver_id INT NOT NULL,
            status ENUM('SCHEDULED', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
            created_by ENUM('SHOP', 'ADMIN', 'EMPLOYEE') NOT NULL DEFAULT 'SHOP',
            comments TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    )`;
 await db.query(createTableSQL);

    
    if (
      !collection_type ||
      !customer_id ||
      !pickup_date ||
      !time_slot ||
      !phone_number ||
      !driver_id
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM collections"
    );
    const collection_code = `TMS/COL-${String(total + 1).padStart(2, "0")}`;

    
    const finalCustomerType =
      collection_type === "PAYMENT" ? null : customer_type;

    const insertSQL = `
      INSERT INTO collections
      (collection_code, collection_type, customer_id, customer_type,
       pickup_date, time_slot, phone_number, driver_id, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(insertSQL, [
      collection_code,
      collection_type,
      customer_id,
      finalCustomerType,
      pickup_date,
      time_slot,
      phone_number,
      driver_id,
      comments,
    ]);

    res.status(201).json({
      success: true,
      message: "Collection created successfully",
      collection_code,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET ALL COLLECTIONS (PAGINATION + FILTER READY)
 */
exports.getAllCollections = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM collections"
    );

    const [rows] = await db.query(
      `
      SELECT *
      FROM collections
      ORDER BY id DESC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone_number, driver_id, comments } = req.body;

    const [result] = await db.query(
      `
      UPDATE collections
      SET phone_number = ?, driver_id = ?, comments = ?
      WHERE id = ?
      `,
      [phone_number, driver_id, comments, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    res.json({
      success: true,
      message: "Collection updated",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE COLLECTION (HARD DELETE)
 */
exports.deleteCollection = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM collections WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Collection not found",
      });
    }

    res.json({
      success: true,
      message: "Collection deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
