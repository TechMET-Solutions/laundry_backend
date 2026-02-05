const db = require("../../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();

// 🔐 Decrypt CryptoJS encrypted password (U2FsdGVkX... format)
function decryptPassword(encrypted, secret) {
  try {
    // Remove the "U2FsdGVkX1" prefix and decode from Base64
    const data = Buffer.from(encrypted, 'base64');

    // First 8 bytes are the salt marker and salt
    const salt = data.slice(8, 16);
    const encryptedData = data.slice(16);

    // Derive key and IV from secret + salt using EVP_BytesToKey equivalent
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

    // Decrypt using AES-256-CBC
    const decipher = crypto.createDecipheriv('aes-256-cbc', key.slice(0, 32), iv.slice(0, 16));
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (e) {
    return null;
  }
}

// ✅ LOGIN - Employee/Supervisor Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email aur password dono zaroori hain",
      });
    }

    // ✅ Check demo admin account (fast login for testing)
    const demoAdmin = {
      email: "admin@gmail.com",
      password: "admin",
    };

    if (email === demoAdmin.email && password === demoAdmin.password) {
      console.log(`✅ Demo Admin login successful`);
      const token = jwt.sign(
        {
          id: 0,
          email: "admin@gmail.com",
          role: "Admin",
          name: "Demo Admin",
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "✅ Login successful (Demo Admin)",
        token,
        user: {
          id: 0,
          first_name: "Demo",
          last_name: "Admin",
          email: "admin@gmail.com",
          role: "Admin",
        },
      });
    }

    // ✅ Check if employee exists
    const [employees] = await db.query(
      `SELECT * FROM Employee WHERE email = ?`,
      [email]
    );

    console.log(`📧 Email lookup: ${email}, Found: ${employees.length} employee(s)`);

    if (employees.length === 0) {
      return res.status(401).json({
        success: false,
        message: "❌ Email ya password galat hai - Employee nahi mila",
      });
    }

    const employee = employees[0];
    console.log(`👤 Employee found: ${employee.first_name}, Role: ${employee.role}, Status: ${employee.status}`);

    // ✅ Check if employee is active
    if (employee.status === 0) {
      return res.status(403).json({
        success: false,
        message: "❌ Yeh employee inactive hai",
      });
    }

    // ✅ Check password (plain text ya bcrypt dono ke liye)
    let passwordMatch = false;

    // Agar password CryptoJS encrypted hai (U2FsdGVkX... format)
    if (employee.password.startsWith("U2FsdGVkX")) {
      console.log(`🔐 Trying CryptoJS AES decryption...`);

      const secretsToTry = [
        "your-secret-key",
        "secret",
        "laundry",
        "laundry_pos",
        process.env.CRYPTO_SECRET,
      ].filter(Boolean);

      for (const secret of secretsToTry) {
        const decrypted = decryptPassword(employee.password, secret);
        if (decrypted) {
          console.log(`🔐 Tried secret "${secret}": decrypted = "${decrypted}"`);
          if (decrypted === password) {
            passwordMatch = true;
            console.log(`✅ Password matched with secret: "${secret}"`);
            break;
          }
        }
      }
    }
    // Agar password bcrypt se hash hai
    else if (employee.password.startsWith("$2")) {
      passwordMatch = await bcrypt.compare(password, employee.password);
      console.log(`🔐 Password check (bcrypt): ${passwordMatch}`);
    }
    // Agar password plain text hai
    else {
      passwordMatch = password === employee.password;
      console.log(`🔐 Password check (plain): ${passwordMatch}`);
    }

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "❌ Email ya password galat hai - Password mismatch",
      });
    }

    // ✅ Check if user is a Supervisor or Admin
    const allowedRoles = ["supervisor", "admin"];
    const employeeRole = String(employee.role || "").toLowerCase();
    if (!allowedRoles.includes(employeeRole)) {
      return res.status(403).json({
        success: false,
        message: `❌ Sirf Supervisor aur Admin login kar sakte hain. Your role: ${employee.role}`,
      });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      {
        id: employee.id,
        email: employee.email,
        role: employee.role,
        name: `${employee.first_name} ${employee.last_name}`,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "✅ Login successful",
      token,
      user: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// ✅ GET Current User (Token se)
exports.getCurrentUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "❌ Token nahi mila",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

    const [employees] = await db.query(
      `SELECT * FROM Employee WHERE id = ?`,
      [decoded.id]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: "❌ Employee nahi mila",
      });
    }

    const employee = employees[0];

    res.json({
      success: true,
      user: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        role: employee.role,
      },
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "❌ Invalid token",
      error: err.message,
    });
  }
};

// 🔧 DEBUG ENDPOINT - Encrypted password ko dekho
exports.debugPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const [employees] = await db.query(
      `SELECT email, password, role FROM Employee WHERE email = ?`,
      [email]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee nahi mila",
      });
    }

    const employee = employees[0];

    res.json({
      success: true,
      email: employee.email,
      role: employee.role,
      storedPassword: employee.password,
      passwordFormat: employee.password.startsWith("U2FsdGVkX") ? "CryptoJS Encrypted" : employee.password.startsWith("$2") ? "Bcrypt" : "Plain Text",
      note: "Ye plain password nahi hai, sirf dekh rahe ho format ke liye"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// 🔐 MIDDLEWARE - Role-based access check
exports.checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "❌ Token nahi mila",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

      const decodedRole = String(decoded.role || "").toLowerCase();
      const normalizedAllowed = allowedRoles.map((role) =>
        String(role).toLowerCase()
      );
      if (!normalizedAllowed.includes(decodedRole)) {
        return res.status(403).json({
          success: false,
          message: `❌ Aapko is function ke liye access nahi hai. Required role: ${allowedRoles.join(", ")}`,
        });
      }

      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({
        success: false,
        message: "❌ Invalid token",
        error: err.message,
      });
    }
  };
};

// ✅ SUPERVISOR - Get all employees
exports.getEmployeesForSupervisor = async (req, res) => {
  try {
    const [employees] = await db.query(
      `SELECT id, first_name, last_name, email, role, mobile_no, hire_date, status FROM Employee WHERE role IN ('Driver', 'Supervisor')`
    );

    res.json({
      success: true,
      message: `✅ ${employees.length} employees found`,
      data: employees,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// ✅ ADMIN - Get all employees (including admins)
exports.getAllEmployeesForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM Employee`);

    const [employees] = await db.query(
      `SELECT id, first_name, last_name, email, role, mobile_no, hire_date, status FROM Employee LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      success: true,
      message: `✅ ${employees.length} employees found`,
      total,
      page,
      limit,
      data: employees,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
