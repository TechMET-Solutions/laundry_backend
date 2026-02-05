const db = require("../../config/database");
const crypto = require("crypto");

// 🔐 Encrypt password in CryptoJS/OpenSSL salted format (U2FsdGVkX...)
function encryptPassword(plainText, secret) {
    const salt = crypto.randomBytes(8);

    const hash1 = crypto
        .createHash("md5")
        .update(Buffer.concat([Buffer.from(secret), salt]))
        .digest();
    const hash2 = crypto
        .createHash("md5")
        .update(Buffer.concat([hash1, Buffer.from(secret), salt]))
        .digest();

    const key = Buffer.concat([hash1, hash2]);
    const iv = key.slice(16, 32);

    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        key.slice(0, 32),
        iv.slice(0, 16)
    );

    const encrypted = Buffer.concat([
        cipher.update(Buffer.from(plainText, "utf8")),
        cipher.final(),
    ]);

    const salted = Buffer.concat([Buffer.from("Salted__"), salt, encrypted]);
    return salted.toString("base64");
}

function normalizeEncryptedPassword(password) {
    if (!password) return password;
    if (password.startsWith("U2FsdGVkX") || password.startsWith("$2")) {
        return password;
    }

    const secret = process.env.CRYPTO_SECRET || "your-secret-key";
    return encryptPassword(password, secret);
}

// ✅ CREATE Employee (AUTO CREATE TABLE + INSERT)
exports.createEmployee = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            role, // supplier | driver
            mobile_no,
            email,
            password,
            dob,
            hire_date,
            address,
            status,
            vehicle_id,
            license_no,
        } = req.body;

        // ✅ Auto-create table
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS Employee (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('Admin','Supervisor','Driver') NOT NULL,
        mobile_no VARCHAR(20) NOT NULL,
        email VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        dob DATE NOT NULL,
        hire_date DATE NOT NULL,
        address VARCHAR(255) NOT NULL,
        vehicle_id VARCHAR(100),
        license_no VARCHAR(100),
        status TINYINT(1) DEFAULT 1, -- 0 = inactive, 1 = active
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        await db.query(createTableSQL);

        // ✅ Insert Employee
        const insertSQL = `
      INSERT INTO Employee 
      (
        first_name, last_name, role, mobile_no, email, password,
        dob, hire_date, address, vehicle_id, license_no, status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const [result] = await db.query(insertSQL, [
            first_name,
            last_name,
            role,
            mobile_no,
            email,
            normalizeEncryptedPassword(password),
            dob,
            hire_date,
            address,
            vehicle_id,
            license_no,
            status,
        ]);

        res.status(201).json({
            success: true,
            message: "✅ Employee added successfully",
            id: result.insertId,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};


// ✅ GET ALL WITH PAGINATION
exports.getAllEmployees = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;   // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const offset = (page - 1) * limit;

        // Get total count
        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM Employee`);

        // Get paginated data
        const [rows] = await db.query(
            `SELECT * FROM Employee ORDER BY id DESC LIMIT ? OFFSET ?`,
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


// ✅ GET BY ID
exports.getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`SELECT * FROM Employee WHERE id = ?`, [id]);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};



// ✅ UPDATE
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            first_name,
            last_name,
            role,
            mobile_no,
            email,
            password,
            dob,
            hire_date,
            address,
            vehicle_id,
            license_no,
            status,
        } = req.body;

        const updateSQL = `
      UPDATE Employee SET
        first_name = ?,
        last_name = ?,
        role = ?,
        mobile_no = ?,
        email = ?,
        password = ?,
        dob = ?,
        hire_date = ?,
        address = ?,
        vehicle_id = ?,
        license_no = ?,
        status = ?
      WHERE id = ?
    `;

        const [result] = await db.query(updateSQL, [
            first_name,
            last_name,
            role,
            mobile_no,
            email,
            normalizeEncryptedPassword(password),
            dob,
            hire_date,
            address,
            vehicle_id,
            license_no,
            status,
            id,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        res.json({ success: true, message: "Employee updated" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ✅ DELETE
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(`DELETE FROM Employee WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        res.json({ success: true, message: "Employee deleted" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};