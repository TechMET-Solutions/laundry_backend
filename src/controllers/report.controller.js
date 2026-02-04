const db = require("../../config/database");
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');

exports.getPaymentReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // 🔢 Total payments count (NOT orders)
        const [countResult] = await db.query(
            `SELECT COUNT(*) AS total FROM payments WHERE payment_status = 'success'`
        );

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // 📊 Payment report data
        const [rows] = await db.query(`
      SELECT 
        p.created_at AS date,
        o.order_code AS order_id,
        o.customer_name AS customer,
        o.driver_name AS driver,
        p.amount AS amount,
        p.payment_method AS payment_type,
        o.remark AS note
      FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      WHERE p.payment_status = 'success'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

        const reportData = rows.map((row, index) => ({
            sr_no: offset + index + 1,
            date: row.date,
            order_id: row.order_id,
            customer: row.customer,
            driver: row.driver,
            amount: Number(row.amount).toFixed(2),
            payment_type: row.payment_type,
            note: row.note || ""
        }));

        res.json({
            success: true,
            data: reportData,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// 1. GET DATA API

exports.getDailyReport = async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        const [rows] = await db.query(`
            SELECT 'Orders' AS Particulars, COUNT(*) AS Value
            FROM orders
            WHERE order_date BETWEEN ? AND ?

            UNION ALL

            SELECT 'No. of Orders Delivered', COUNT(*)
            FROM orders
            WHERE status = 'DELIVERED'
            AND order_date BETWEEN ? AND ?

            UNION ALL

            SELECT 'Total Sales', CONCAT('AED ', COALESCE(SUM(total_amount), 0))
            FROM orders
            WHERE order_date BETWEEN ? AND ?

            UNION ALL

            SELECT 'Total Payment', CONCAT('AED ', COALESCE(SUM(paid_amount), 0))
            FROM orders
            WHERE order_date BETWEEN ? AND ?

            UNION ALL

            SELECT 'Total Outstanding',
                   CONCAT('AED ', COALESCE(SUM(total_amount - paid_amount), 0))
            FROM orders
            WHERE order_date BETWEEN ? AND ?
        `, [
            startDate, endDate,
            startDate, endDate,
            startDate, endDate,
            startDate, endDate,
            startDate, endDate
        ]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Tax Report
exports.printTaxReport = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        // 🔒 Validation
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "start_date and end_date are required",
            });
        }

        const reportSQL = `
              SELECT 
                id,
                order_code,
                order_date,
                sub_total,
                tax,
                gross_total
              FROM orders
              WHERE order_date BETWEEN ? AND ?
              ORDER BY order_date DESC
            `;
        
                const [rows] = await db.query(reportSQL, [
                    start_date,
                    end_date,
                ]);
        
        // Optional totals
        const totalDebit = rows.reduce(
            (sum, item) => sum + Number(item.gross_total),
            0
        );

        const totalCredit = rows.reduce(
            (sum, item) => sum + Number(item.tax || 0),
            0
        );
        
        return res.status(200).json({
            success: true,
            message: "Tax report fetched successfully",
            filters: {
                start_date,
                end_date,
            },
            summary: {
                total_records: rows.length,
                total_debit: totalDebit,
                total_credit: totalCredit,
            },
            data: rows,
        });
        
    } catch (err) {
        console.error(" Tax Report Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch tax report",
        });
    }
};

// Order Report
exports.getOrderReport = async (req, res) => {
    try {
        const { start_date, end_date, customer_name, driver_name } = req.query;

        // 🔒 Validation
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "start_date and end_date are required",
            });
        }

        // 🔧 Dynamic conditions
        let conditions = [];
        let params = [];

        conditions.push("order_date BETWEEN ? AND ?");
        params.push(start_date, end_date);

        if (customer_name) {
            conditions.push("customer_name LIKE ?");
            params.push(`%${customer_name}%`);
        }

        if (driver_name) {
            conditions.push("driver_name LIKE ?");
            params.push(`%${driver_name}%`);
        }

        // ✅ MAIN QUERY (FIXED)
        const reportSQL = `
      SELECT
        id,
        order_code,
        order_date,
        customer_id,
        customer_name,
        driver_id,
        driver_name,
        sub_total,
        gross_total,
        discount,
        tax,
        order_status
      FROM orders
      WHERE ${conditions.join(" AND ")}
      ORDER BY order_date DESC
    `;

        const [rows] = await db.query(reportSQL, params);

        // ✅ SUMMARY CALCULATIONS
        const totalOrder = rows.length;

        const totalAmount = rows.reduce(
            (sum, row) => sum + Number(row.gross_total || 0),
            0
        );

        return res.status(200).json({
            success: true,
            message: "Order report fetched successfully",
            filters: {
                start_date,
                end_date,
                customer_name,
                driver_name,
            },
            summary: {
                total_order: totalOrder,
                total_amount: totalAmount,
            },
            data: rows,
        });

    } catch (err) {
        console.error("Order Report Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch Order report",
        });
    }
};

// Sales Report
exports.getSalesReport = async (req, res) => {
    try {
        const { start_date, end_date, customer_name, driver_name } = req.query;

        // 🔒 Validation
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "start_date and end_date are required",
            });
        }

        // 🔧 Dynamic conditions
        let conditions = [];
        let params = [];

        conditions.push("order_date BETWEEN ? AND ?");
        params.push(start_date, end_date);

        if (customer_name) {
            conditions.push("customer_name LIKE ?");
            params.push(`%${customer_name}%`);
        }

        if (driver_name) {
            conditions.push("driver_name LIKE ?");
            params.push(`%${driver_name}%`);
        }

        // ✅ MAIN QUERY
        const reportSQL = `
      SELECT
        id,
        order_code,
        order_date,
        customer_name,
        driver_name,
        sub_total,
        addon,
        discount,
        tax,
        gross_total
      FROM orders
      WHERE ${conditions.join(" AND ")}
      ORDER BY order_date DESC
    `;

        const [rows] = await db.query(reportSQL, params);

        // ✅ SUMMARY CALCULATIONS
        const totalOrder = rows.length;

        const totalTaxAmount = rows.reduce(
            (sum, row) => sum + Number(row.tax || 0),
            0
        );

        const totalAmount = rows.reduce(
            (sum, row) => sum + Number(row.gross_total || 0),
            0
        );

        return res.status(200).json({
            success: true,
            message: "Sales report fetched successfully",
            filters: {
                start_date,
                end_date,
                customer_name,
                driver_name,
            },
            summary: {
                total_order: totalOrder,
                total_amount: totalAmount,
                total_tax: totalTaxAmount,
            },
            data: rows,
        });

    } catch (err) {
        console.error("Sales Report Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch Sales report",
        });
    }
};

exports.getClothWiseReport = async (req, res) => {
    try {
        
    } catch (err) {
        console.error("Cloth Wise Report Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch Cloth Wise report",
        });
    }
}