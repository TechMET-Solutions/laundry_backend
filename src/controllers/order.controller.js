const db = require("../../config/database");

const ALLOWED_STATUSES = new Set([
  "RECEIVED",
  "PENDING",
  "DELIVERED",
  "PROCESSING",
  "OUT_FOR_DELIVERY",
]);

const normalizeStatus = (value) => {
  if (!value) return "PENDING";
  const normalized = value.toString().trim().toUpperCase().replace(/\s+/g, "_");
  if (!ALLOWED_STATUSES.has(normalized)) {
    return null;
  }
  return normalized;
};

// CREATE Order (auto-creates table + sequential code)
exports.createOrder = async (req, res) => {
  try {
    const {
      orderDate,
      deliveryDate,
      customerName,
      driverName,
      amount = 0,
      totalAmount,
      paidAmount = 0,
      currency = "AED",
      status,
    } = req.body;

    const dbStatus = normalizeStatus(status);

    if (!orderDate || !deliveryDate || !customerName || !driverName || totalAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "orderDate, deliveryDate, customerName, driverName, totalAmount are required",
      });
    }

    if (!dbStatus) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: RECEIVED, PENDING, DELIVERED, PROCESSING, OUT_FOR_DELIVERY",
      });
    }

    const createTableSQL = `
			CREATE TABLE IF NOT EXISTS orders (
				id INT AUTO_INCREMENT PRIMARY KEY,
				order_code VARCHAR(30) NOT NULL UNIQUE,
				order_date DATE NOT NULL,
				delivery_date DATE NOT NULL,
				customer_name VARCHAR(150) NOT NULL,
				driver_name VARCHAR(150) NOT NULL,
				amount DECIMAL(10,2) DEFAULT 0,
				total_amount DECIMAL(10,2) NOT NULL,
				paid_amount DECIMAL(10,2) DEFAULT 0,
				currency VARCHAR(10) NOT NULL DEFAULT 'AED',
				status ENUM('RECEIVED','PENDING','DELIVERED','PROCESSING','OUT_FOR_DELIVERY') NOT NULL DEFAULT 'PENDING',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`;
    await db.query(createTableSQL);

    const [[lastRow]] = await db.query(
      `SELECT order_code FROM orders ORDER BY id DESC LIMIT 1`
    );

    let nextNumber = 1;

    if (lastRow && lastRow.order_code) {
      const lastNumber = parseInt(lastRow.order_code.split("-").pop(), 10);
      if (!Number.isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    const orderCode = `TMS/ORD-${String(nextNumber).padStart(2, "0")}`;

    const insertSQL = `
			INSERT INTO orders (
				order_code,
				order_date,
				delivery_date,
				customer_name,
				driver_name,
				amount,
				total_amount,
				paid_amount,
				currency,
				status
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`;

    const [result] = await db.query(insertSQL, [
      orderCode,
      orderDate,
      deliveryDate,
      customerName,
      driverName,
      amount,
      totalAmount,
      paidAmount,
      currency,
      dbStatus,
    ]);

    res.status(201).json({
      success: true,
      message: "Order created",
      data: {
        id: result.insertId,
        orderCode,
        orderDate,
        deliveryDate,
        customerName,
        driverName,
        amount,
        totalAmount,
        paidAmount,
        currency,
        status: dbStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET paginated orders
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM orders"
    );

    const [rows] = await db.query(
      `SELECT * FROM orders ORDER BY id DESC LIMIT ? OFFSET ?`,
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

// GET single order
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`SELECT * FROM orders WHERE id = ?`, [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// UPDATE order status, payment, and scheduling fields
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      orderDate,
      deliveryDate,
      customerName,
      driverName,
      amount,
      totalAmount,
      paidAmount,
      currency,
      status,
    } = req.body;

    const dbStatus = status ? normalizeStatus(status) : null;
    if (status && !dbStatus) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: RECEIVED, PENDING, DELIVERED, PROCESSING, OUT_FOR_DELIVERY",
      });
    }

    const updateSQL = `
			UPDATE orders
			SET
				order_date = COALESCE(?, order_date),
				delivery_date = COALESCE(?, delivery_date),
				customer_name = COALESCE(?, customer_name),
				driver_name = COALESCE(?, driver_name),
				amount = COALESCE(?, amount),
				total_amount = COALESCE(?, total_amount),
				paid_amount = COALESCE(?, paid_amount),
				currency = COALESCE(?, currency),
				status = COALESCE(?, status)
			WHERE id = ?
		`;

    const [result] = await db.query(updateSQL, [
      orderDate || null,
      deliveryDate || null,
      customerName || null,
      driverName || null,
      amount ?? null,
      totalAmount ?? null,
      paidAmount ?? null,
      currency || null,
      dbStatus || null,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, message: "Order updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE order
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(`DELETE FROM orders WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
