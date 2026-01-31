const db = require("../../config/database");

// CREATE Order (auto-creates table + sequential code)
exports.createOrder = async (req, res) => {
  try {
    const {
      addon,
      orderDate,
      deliveryDate,
      customerName,
      customerId,
      driverId,
      driverName,
      subTotal = 0,
      grossTotal,
      paidAmount = 0,
      pendingAmount = 0,
      discount = 0,
      tax = 0,
      paymentMethod,
      status = "Pending",
      remark = "",
      itemList
    } = req.body;

    if (!orderDate || !deliveryDate || !customerName || !driverId || !driverName || grossTotal === undefined) {
      return res.status(400).json({
        success: false,
        message: "orderDate, deliveryDate, customerName, customerId, driverId, driverName, grossTotal and itemList are required",
      });
    }

    const createTableSQL = `
			CREATE TABLE IF NOT EXISTS orders (
				id INT AUTO_INCREMENT PRIMARY KEY,
				order_code VARCHAR(30) NOT NULL UNIQUE,
				order_date DATE NOT NULL,
				delivery_date DATE NOT NULL,
				customer_id INT NOT NULL,
				customer_name VARCHAR(150) NOT NULL,
				driver_id INT NOT NULL,
				driver_name VARCHAR(150) NOT NULL,
				sub_total DECIMAL(10,2) DEFAULT 0,
				gross_total DECIMAL(10,2) NOT NULL,
				paid_amount DECIMAL(10,2) DEFAULT 0,
        pending_amount DECIMAL(10,2) DEFAULT 0,
				discount DECIMAL(10,2) DEFAULT 0,
				tax DECIMAL(10,2) DEFAULT 0,
				payment_method VARCHAR(50),
				status ENUM('Pending','Processing','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
				remark TEXT,
        addon JSON,
        item_list JSON NOT NULL,
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

    const orderCode = `TMS/ORD-${String(nextNumber).padStart(3, "0")}`;

    const insertSQL = `
			INSERT INTO orders (
				order_code,
				order_date,
				delivery_date,
				customer_id,
				customer_name,
				driver_id,
				driver_name,
				sub_total,
				gross_total,
				paid_amount,
        pending_amount,
				discount,
				tax,
				payment_method,
				status,
				remark,
        addon,
        item_list
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`;

    const [result] = await db.query(insertSQL, [
      orderCode,
      orderDate,
      deliveryDate,
      customerId,
      customerName,
      driverId,
      driverName,
      subTotal,
      grossTotal,
      paidAmount,
      pendingAmount,
      discount,
      tax,
      paymentMethod,
      status,
      remark,
      JSON.stringify(addon),
      JSON.stringify(itemList)
    ]);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        id: result.insertId,
        orderCode,
        orderDate,
        deliveryDate,
        customerId,
        customerName,
        driverId,
        driverName,
        subTotal,
        grossTotal,
        paidAmount,
        pendingAmount,
        discount,
        tax,
        paymentMethod,
        status,
        remark,
        addon,
        itemList
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
				customer_id INT NOT NULL,
				customer_name VARCHAR(150) NOT NULL,
				driver_id INT NOT NULL,
				driver_name VARCHAR(150) NOT NULL,
				sub_total DECIMAL(10,2) DEFAULT 0,
				gross_total DECIMAL(10,2) NOT NULL,
				paid_amount DECIMAL(10,2) DEFAULT 0,
        pending_amount DECIMAL(10,2) DEFAULT 0,
				discount DECIMAL(10,2) DEFAULT 0,
				tax DECIMAL(10,2) DEFAULT 0,
				payment_method VARCHAR(50),
				status ENUM('Pending','Processing','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
				remark TEXT,
        addon JSON,
        item_list JSON NOT NULL,
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
      `SELECT * FROM orders ORDER BY id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    //  JSON parse here
    rows.forEach(row => {
      if (row.addon) row.addon = JSON.parse(row.addon);
      if (row.item_list) row.item_list = JSON.parse(row.item_list);
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

    const order = rows[0];
    if (order.addon) order.addon = JSON.parse(order.addon);
    if (order.item_list) order.item_list = JSON.parse(order.item_list);

    res.json({ success: true, data: order });
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
