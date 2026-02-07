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
  order_status ENUM(
    'Order Received',
    'Processing',
    'Ready to Deliver',
    'Out for Delivery',
    'Partial Delivery',
    'Delivered',
    'Returned',
    'Pending Delivery',
    'Deleted'
  ) DEFAULT 'Order Received',
  remark TEXT,
  addon JSON,
  item_list JSON NOT NULL,
  created_by VARCHAR(100) NOT NULL,
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
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

`;

exports.createOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const {
      addon = [],
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
      itemList = [],
      created_by,

      // payment (optional)
      paidAmount = 0,
      paymentMethod = null,
      paymentStage = "partial"
    } = req.body;

    // ✅ Validation
    if (
      !orderDate ||
      !deliveryDate ||
      !customerName ||
      !customerId ||
      !driverId ||
      !driverName ||
      grossTotal === undefined ||
      !created_by
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // ✅ Ensure tables inside transaction
    await conn.query(createOrderTable);
    await conn.query(createPaymentTable);

    // 🔢 Generate order code safely (LOCK latest row)
    const [[lastRow]] = await conn.query(
      `SELECT order_code 
       FROM orders 
       ORDER BY id DESC 
       LIMIT 1 
       FOR UPDATE`
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
        order_code,
        order_date,
        delivery_date,
        customer_id,
        customer_name,
        driver_id,
        driver_name,
        sub_total,
        gross_total,
        discount,
        tax,
        order_status,
        remark,
        addon,
        item_list,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Order Received', ?, ?, ?, ?)`,
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
        JSON.stringify(addon || []),
        JSON.stringify(itemList || []),
        created_by,
      ]
    );

    const orderId = orderResult.insertId;

    // 💰 Insert payment ONLY if paidAmount > 0
    if (Number(paidAmount) > 0) {
      await conn.query(
        `INSERT INTO payments (
          order_id,
          amount,
          payment_method,
          payment_stage,
          payment_status,
          created_by
        ) VALUES (?, ?, ?, ?, 'success', ?)`,
        [orderId, paidAmount, paymentMethod, paymentStage, created_by]
      );
    }

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId,
        orderCode,
        grossTotal,
        paidAmount,
      },
    });
  } catch (err) {
    await conn.rollback();

    console.error("Create Order Error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: err.message,
    });
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
        o.id,
        o.order_code,
        o.order_date,
        o.delivery_date,
        o.customer_id,
        o.customer_name,
        o.driver_id,
        o.driver_name,
        o.sub_total,
        o.gross_total,
        o.discount,
        o.tax,
        o.order_status,
        o.remark,
        o.addon,
        o.item_list,
        o.created_by,          -- ⭐ explicitly included
        o.created_at,

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

    // 🧹 Safe JSON parse + number formatting
    const parsedRows = rows.map(row => {
      let addon = null;
      let item_list = [];

      try {
        addon = row.addon ? JSON.parse(row.addon) : null;
      } catch { }

      try {
        item_list = row.item_list ? JSON.parse(row.item_list) : [];
      } catch { }

      return {
        ...row,
        addon,
        item_list,
        paid_amount: Number(row.paid_amount),
        pending_amount: Number(row.pending_amount),
        created_by: row.created_by || "System", // fallback
      };
    });

    res.json({
      success: true,
      data: parsedRows,
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


exports.softDelete = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate id
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const [result] = await db.query(
      `
      UPDATE orders
      SET order_status = 'Deleted'
      WHERE id = ? AND order_status != 'Deleted'
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found or already deleted",
      });
    }

    return res.json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: err.message,
    });
  }
};


exports.revokeOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate id
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
    }

    const [result] = await db.query(
      `
      UPDATE orders
      SET order_status = 'Order Received'
      WHERE id = ? AND order_status = 'Deleted'
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found or not deleted",
      });
    }

    return res.json({
      success: true,
      message: "Order restored successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to restore order",
      error: err.message,
    });
  }
};



// Update Driver Info
exports.updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, driverName } = req.body;

    // Validate required fields
    if (!driverId || !driverName) {
      return res.status(400).json({
        success: false,
        message: "Driver ID and Driver Name are required"
      });
    }

    // Check if order exists
    const [[order]] = await db.query(
      `SELECT id FROM orders WHERE id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Update driver information
    const [result] = await db.query(
      `UPDATE orders 
       SET driver_id = ?, driver_name = ? 
       WHERE id = ?`,
      [driverId, driverName, id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to update driver information"
      });
    }

    res.json({
      success: true,
      message: "Driver information updated successfully",
      data: {
        orderId: id,
        driverId,
        driverName
      }
    });

  } catch (err) {
    console.error("updateDriver error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Update Order Details
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      deliveryDate,
      customerName,
      driverName,
      driverId,
      itemList,
      addon,
      discount,
      remark,
      subTotal,
      grossTotal,
      tax,
      orderStatus
    } = req.body;

    // Check if order exists
    const [[order]] = await db.query(
      `SELECT id FROM orders WHERE id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (deliveryDate !== undefined) {
      updateFields.push('delivery_date = ?');
      updateValues.push(deliveryDate);
    }
    if (customerName !== undefined) {
      updateFields.push('customer_name = ?');
      updateValues.push(customerName);
    }
    if (driverName !== undefined) {
      updateFields.push('driver_name = ?');
      updateValues.push(driverName);
    }
    if (driverId !== undefined) {
      updateFields.push('driver_id = ?');
      updateValues.push(driverId);
    }
    if (itemList !== undefined) {
      updateFields.push('item_list = ?');
      updateValues.push(JSON.stringify(itemList));
    }
    if (addon !== undefined) {
      updateFields.push('addon = ?');
      updateValues.push(JSON.stringify(addon));
    }
    if (discount !== undefined) {
      updateFields.push('discount = ?');
      updateValues.push(discount);
    }
    if (remark !== undefined) {
      updateFields.push('remark = ?');
      updateValues.push(remark);
    }
    if (subTotal !== undefined) {
      updateFields.push('sub_total = ?');
      updateValues.push(subTotal);
    }
    if (grossTotal !== undefined) {
      updateFields.push('gross_total = ?');
      updateValues.push(grossTotal);
    }
    if (tax !== undefined) {
      updateFields.push('tax = ?');
      updateValues.push(tax);
    }
    if (orderStatus !== undefined) {
      updateFields.push('order_status = ?');
      updateValues.push(orderStatus);
    }

    // If no fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update"
      });
    }

    // Add order ID to values
    updateValues.push(id);

    // Execute update
    const [result] = await db.query(
      `UPDATE orders 
       SET ${updateFields.join(', ')} 
       WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to update order"
      });
    }

    res.json({
      success: true,
      message: "Order updated successfully",
      data: { orderId: id }
    });

  } catch (err) {
    console.error("updateOrder error:", err);
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


// Update order status

exports.UpdateOrderStatus = async (req, res) => {
  const orderId = req.params.id;
  const { order_status } = req.body;

  const validStatuses = [
    "Order Received",
    "Processing",
    "Ready to Deliver",
    "Out for Delivery",
    "Partial Delivery",
    "Delivered",
    "Returned",
    "Pending Delivery",
    "Deleted"
  ];

  // Validate status
  if (!validStatuses.includes(order_status)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  try {
    const [result] = await db.query(
      "UPDATE orders SET order_status = ? WHERE id = ?",
      [order_status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order status updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// router.get("/orders/:id/status",

exports.getOrderById = async (req, res) => {
  const orderId = req.params.id;

  try {
    const [rows] = await db.query(
      "SELECT id, order_code, order_status FROM orders WHERE id = ?",
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
