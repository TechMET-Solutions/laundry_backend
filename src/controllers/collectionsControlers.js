const db = require("../../config/database");

// ✅ CREATE Collections (AUTO CREATE TABLE + INSERT)
exports.createCollections = async (req, res) => {
    try {
        const { name, status } = req.body;

        // ✅ Auto-create table
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS Collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        status ENUM('Available', 'Unavailable') DEFAULT 'Available',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await db.query(createTableSQL);

        // ✅ Insert Collections
        const insertSQL = `
      INSERT INTO Collections (name, status)
      VALUES (?, ?)
    `;

        const [result] = await db.query(insertSQL, [name, status]);

        res.status(201).json({
            success: true,
            message: "✅ Collections added successfully",
            id: result.insertId,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};