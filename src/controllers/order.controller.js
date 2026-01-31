const db = require("../../config/database");

// TABLE CREATION
const createOrderTable = `
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
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  order_status ENUM('Pending','Processing','Delivered','Cancelled') DEFAULT 'Pending',
  remark TEXT,
  addon JSON,
  item_list JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

`;

const createPaymentTable = `
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_stage ENUM('advance','partial','final') DEFAULT 'partial',
  payment_status ENUM('success','pending','failed') DEFAULT 'success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

`;

exports.createOrder = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

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
      discount = 0,
      tax = 0,
      remark = "",
      itemList,

      // payment (optional)
      paidAmount = 0,
      paymentMethod = null,
      paymentStage = "partial"
    } = req.body;

    if (!orderDate || !deliveryDate || !customerName || !customerId || !driverId || !driverName || grossTotal === undefined) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    await db.query(createOrderTable);
    await db.query(createPaymentTable);

    // 🔢 Generate order code
    const [[lastRow]] = await conn.query(
      `SELECT order_code FROM orders ORDER BY id DESC LIMIT 1`
    );

    let nextNumber = 1;
    if (lastRow?.order_code) {
      const lastNumber = parseInt(lastRow.order_code.split("-").pop(), 10);
      if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
    }

    const orderCode = `TMS/ORD-${String(nextNumber).padStart(3, "0")}`;

    // 🧾 Insert order
    const [orderResult] = await conn.query(
      `INSERT INTO orders (
        order_code, order_date, delivery_date,
        customer_id, customer_name,
        driver_id, driver_name,
        sub_total, gross_total,
        discount, tax,
        order_status, remark,
        addon, item_list
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`,
      [
        orderCode,
        orderDate,
        deliveryDate,
        customerId,
        customerName,
        driverId,
        driverName,
        subTotal,
        grossTotal,
        discount,
        tax,
        remark,
        JSON.stringify(addon),
        JSON.stringify(itemList)
      ]
    );

    const orderId = orderResult.insertId;

    // 💰 Insert payment ONLY if paidAmount > 0
    if (paidAmount > 0) {
      await conn.query(
        `INSERT INTO payments (
          order_id, amount, payment_method, payment_stage, payment_status
        ) VALUES (?, ?, ?, ?, 'success')`,
        [orderId, paidAmount, paymentMethod, paymentStage]
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId,
        orderCode,
        grossTotal,
        paidAmount
      }
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

exports.addPayment = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      orderId,
      amount,
      paymentMethod,
      paymentStage = "partial",
      note = ""
    } = req.body;

    if (!orderId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "orderId and valid amount are required"
      });
    }

    // 1️⃣ Get order total
    const [[order]] = await conn.query(
      `SELECT id, gross_total FROM orders WHERE id = ?`,
      [orderId]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // 2️⃣ Get total paid amount
    const [[paidResult]] = await conn.query(
      `SELECT IFNULL(SUM(amount),0) AS paid_amount
       FROM payments
       WHERE order_id = ? AND payment_status = 'success'`,
      [orderId]
    );

    const paidAmount = paidResult.paid_amount;
    const balanceAmount = order.gross_total - paidAmount;

    // 3️⃣ Overpayment check
    if (amount > balanceAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment exceeds remaining balance (${balanceAmount})`
      });
    }

    // 4️⃣ Insert payment
    await conn.query(
      `INSERT INTO payments
       (order_id, amount, payment_method, payment_stage, payment_status)
       VALUES (?, ?, ?, ?, 'success')`,
      [orderId, amount, paymentMethod, paymentStage]
    );

    const remainingBalance = balanceAmount - amount;

    // 5️⃣ Update order status if fully paid
    if (remainingBalance === 0) {
      await conn.query(
        `UPDATE orders SET order_status = 'Delivered' WHERE id = ?`,
        [orderId]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message: "Payment added successfully",
      data: {
        orderId,
        paidNow: amount,
        totalPaid: paidAmount + amount,
        remainingBalance
      }
    });

  } catch (error) {
    await conn.rollback();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    conn.release();
  }
};

// GET paginated orders
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    // 🔢 Total orders count
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM orders"
    );

    // 📦 Orders with payment summary
    const [rows] = await db.query(
      `
      SELECT 
        o.*,
        IFNULL(SUM(p.amount), 0) AS paid_amount,
        (o.gross_total - IFNULL(SUM(p.amount), 0)) AS pending_amount,
        CASE
          WHEN IFNULL(SUM(p.amount), 0) = 0 THEN 'Pending'
          WHEN IFNULL(SUM(p.amount), 0) < o.gross_total THEN 'Partial'
          ELSE 'Paid'
        END AS payment_status
      FROM orders o
      LEFT JOIN payments p 
        ON o.id = p.order_id 
        AND p.payment_status = 'success'
      GROUP BY o.id
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );

    // 🧹 JSON parse
    rows.forEach(row => {
      if (row.addon) row.addon = JSON.parse(row.addon);
      if (row.item_list) row.item_list = JSON.parse(row.item_list);

      // Ensure numbers
      row.paid_amount = Number(row.paid_amount);
      row.pending_amount = Number(row.pending_amount);
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

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Order + payment summary
    const [rows] = await db.query(
      `
      SELECT 
        o.*,
        IFNULL(SUM(p.amount), 0) AS paid_amount,
        (o.gross_total - IFNULL(SUM(p.amount), 0)) AS pending_amount,
        CASE
          WHEN IFNULL(SUM(p.amount), 0) = 0 THEN 'Pending'
          WHEN IFNULL(SUM(p.amount), 0) < o.gross_total THEN 'Partial'
          ELSE 'Paid'
        END AS payment_status
      FROM orders o
      LEFT JOIN payments p
        ON o.id = p.order_id
        AND p.payment_status = 'success'
      WHERE o.id = ?
      GROUP BY o.id
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const order = rows[0];

    // 2️⃣ Payment history
    const [payments] = await db.query(
      `
      SELECT 
        id,
        amount,
        payment_method,
        payment_stage,
        payment_status,
        created_at
      FROM payments
      WHERE order_id = ?
      ORDER BY created_at DESC
      `,
      [id]
    );

    // 3️⃣ JSON parse
    if (order.addon) order.addon = JSON.parse(order.addon);
    if (order.item_list) order.item_list = JSON.parse(order.item_list);

    // 4️⃣ Number safety
    order.paid_amount = Number(order.paid_amount);
    order.pending_amount = Number(order.pending_amount);

    res.json({
      success: true,
      data: {
        ...order,
        payments
      }
    });

  } catch (err) {
    console.error("getOrderById error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Soft DELETE (Cancel Order)
exports.softDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE orders
      SET order_status = 'Cancelled'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      message: "Order cancelled successfully"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Revoke / Restore Order
exports.revokeOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE orders
      SET order_status = 'Pending'
      WHERE id = ? AND order_status = 'Cancelled'
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found or already active"
      });
    }

    res.json({
      success: true,
      message: "Order revoked successfully"
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// Hard DELETE order (Only if no payments)
exports.hardDelete = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    // 🔍 Check payments
    const [[paymentCheck]] = await conn.query(
      `SELECT COUNT(*) AS total FROM payments WHERE order_id = ?`,
      [id]
    );

    if (paymentCheck.total > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete order with existing payments"
      });
    }

    const [result] = await conn.query(
      `DELETE FROM orders WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    await conn.commit();

    res.json({
      success: true,
      message: "Order permanently deleted"
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({
      success: false,
      error: err.message
    });
  } finally {
    conn.release();
  }
};


