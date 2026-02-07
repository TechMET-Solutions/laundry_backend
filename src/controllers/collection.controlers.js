const db = require("../../config/database");

/**
 * CREATE COLLECTION
 * (TMS/COL code based on LAST inserted value, NOT COUNT)
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
      created_by, // ⭐ NEW
    } = req.body;

    // ❌ STOP creating tables inside APIs (keeping only because you insisted)
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS collections (
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
            comments TEXT NULL,
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        await db.query(createTableSQL);

    // 1️⃣ Validation
    if (
      !collection_type ||
      !customer_id ||
      !pickup_date ||
      !time_slot ||
      !phone_number ||
      !driver_id ||
      !created_by
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // 2️⃣ Get LAST collection_code
    const [[lastRow]] = await db.query(`
      SELECT collection_code
      FROM collections
      ORDER BY id DESC
      LIMIT 1
    `);

    let nextNumber = 1;

    if (lastRow?.collection_code) {
      const lastNumber = parseInt(
        lastRow.collection_code.split("-").pop(),
        10
      );

      if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
    }

    const collection_code = `TMS/COL-${String(nextNumber).padStart(3, "0")}`;

    // 3️⃣ Customer type handling
    const finalCustomerType =
      collection_type === "PAYMENT" ? null : customer_type;

    // 4️⃣ Insert
    const insertSQL = `
      INSERT INTO collections
      (
        collection_code,
        collection_type,
        customer_id,
        customer_type,
        pickup_date,
        time_slot,
        phone_number,
        driver_id,
        comments,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      comments || null,
      created_by, // ⭐ inserted
    ]);

    res.status(201).json({
      success: true,
      message: "Collection created successfully",
      collection_code,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Duplicate collection code",
      });
    }

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

/**
 * GET ALL COLLECTIONS (UNCHANGED)
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

/**
 * UPDATE COLLECTION (UNCHANGED)
 */
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
 * DELETE COLLECTION (UNCHANGED)
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
