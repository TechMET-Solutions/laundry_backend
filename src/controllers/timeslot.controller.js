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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
         
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM timeslot`
        );
        const [rows] = await db.query(
            `
            SELECT * 
            FROM timeslot
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            `,
            [limit, offset]
        );
        const totalPages = Math.ceil(total / limit);
        res.json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                
            },
        });
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


// UPDATE
exports.updateTimeSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const { time_slot, status } = req.body;

        // Validation: must provide something to update
        if (!time_slot && status === undefined) {
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        }

        // Run the query FIRST
        const [result] = await db.query(
            `UPDATE timeslot 
             SET time_slot = COALESCE(?, time_slot), 
                 status = COALESCE(?, status)
             WHERE id = ?`,
            [time_slot, status, id]
        );

        // Check if any row was affected
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Time slot not found"
            });
        }

        // Respond after query runs
        res.status(200).json({
            success: true,
            message: "Time slot updated successfully"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};


// DELETE
exports.deleteTimeSlot = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            "DELETE FROM timeslot WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Time slot not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Time slot deleted successfully"
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};