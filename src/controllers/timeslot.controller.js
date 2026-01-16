const db = require("../../config/database");

//create timeslot table (insert)
exports.createTimeSlot = async(req, res) => {
    try {
        const {
            time_slot,
            status 
        } = req.body;

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS timeslot (
                id INT AUTO_INCREMENT PRIMARY KEY,
                time_slot VARCHAR(50) NOT NULL UNIQUE,
                status TINYINT(1) DEFAULT 1,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
            )
        `;

        await db.query(createTableSQL);

        const insertSQL = `
            INSERT INTO timeslot
            (
                time_slot, status
            )
                VALUES ( ?, ?)
        `;

        const [result] = await db.query(insertSQL, [
            time_slot, status
        ]);

        res.status(201).json({
            success: true,
            message: "timeslot added successfully",
            id: result.insertId,
        })

    }
    catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Time Slot already exits",
            });
        }

        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};


// GET ALL
exports.getAllTimeSlots = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM timeslot ORDER BY id DESC`
        );

        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


// GET BY ID
exports.getTimeSlotById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT * FROM timeslot WHERE id = ?`,
            [id]
        );
        

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Time slot not found",
            });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};







