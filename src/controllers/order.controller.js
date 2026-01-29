const db = require("../../config/database");






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
      allItems
    } = req.body;



    if (!orderDate || !deliveryDate || !customerName || !driverName || totalAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "orderDate, deliveryDate, customerName, driverName, totalAmount are required",
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
				status ENUM('RECEIVED','PENDING','DELIVERED','PROCESSING','DELETED','OUT_FOR_DELIVERY') NOT NULL DEFAULT 'PENDING',
        all_items JSON NOT NULL,
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
				status,
        all_items
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      status,
      JSON.stringify(allItems)
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
        status,
        allItems
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET paginated orders
exports.getOrders = async (req, res) => {
  try {
    // Create table if not exists
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
				status ENUM('RECEIVED','PENDING','DELIVERED','PROCESSING','DELETED','OUT_FOR_DELIVERY') NOT NULL DEFAULT 'PENDING',
        all_items VARCHAR(5000),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`;
    await db.query(createTableSQL);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM orders"
    );

    const [rows] = await db.query(
      `SELECT * FROM orders ORDER BY id ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    //  JSON parse here
    rows.forEach(row => {
      if (row.all_items) row.all_items = JSON.parse(row.all_items);
    });

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
    console.error("getOrders error:", err);
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

// Soft DELETE (update status) order
exports.softDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
    } = req.body;

    const updateSQL = `
      UPDATE orders
      SET
        status = COALESCE(?, status)
      WHERE id = ?
    `;

    const [result] = await db.query(updateSQL, [
      status || null,
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


// Hard DELETE order
exports.hardDelete = async (req, res) => {
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
