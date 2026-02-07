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

exports.exportExcelPaymentReport = async (req, res) => {
    try {
        // 🔎 Same query as GET report (without pagination)
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
        `);

        // 📘 Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Payment Report");

        // 🧾 Columns
        worksheet.columns = [
            { header: "Sr No", key: "sr_no", width: 10 },
            { header: "Date", key: "date", width: 25 },
            { header: "Order ID", key: "order_id", width: 20 },
            { header: "Customer Name", key: "customer", width: 25 },
            { header: "Driver Name", key: "driver", width: 25 },
            { header: "Amount", key: "amount", width: 15 },
            { header: "Payment Type", key: "payment_type", width: 20 },
            { header: "Note", key: "note", width: 30 },
        ];

        // ➕ Add rows
        rows.forEach((row, index) => {
            worksheet.addRow({
                sr_no: index + 1,
                date: row.date,
                order_id: row.order_id,
                customer: row.customer,
                driver: row.driver,
                amount: Number(row.amount).toFixed(2),
                payment_type: row.payment_type,
                note: row.note || ""
            });
        });

        // 🎨 Header bold
        worksheet.getRow(1).font = { bold: true };

        // 📥 Response headers
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=payment-report.xlsx"
        );

        // ⬇️ Send file
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
};

exports.printPaymentReport = async (req, res) => {
    try {
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
        `);

        const tableRows = rows.map((row, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${new Date(row.date).toLocaleDateString()}</td>
                <td><span class="order-id">#${row.order_id}</span></td>
                <td style="text-align: left;">${row.customer}</td>
                <td>${row.driver || 'N/A'}</td>
                <td class="amount">AED${Number(row.amount).toFixed(2)}</td>
                <td><span class="badge">${row.payment_type}</span></td>
                <td style="text-align: left; font-size: 10px;">${row.note || ""}</td>
            </tr>
        `).join("");

        const html = `
            <html>
            <head>
            <script>
            window.onload = () => { window.print(); }
            </script>
                <style>
                    @page { size: A4; margin: 10mm; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        color: #333; 
                        margin: 0; 
                        padding: 0;
                    }
                    
                    /* Header Styling */
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: flex-start; 
                        border-bottom: 2px solid #444; 
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .shop-info h1 { margin: 0; color: #1a56db; text-transform: uppercase; letter-spacing: 1px; }
                    .shop-info p { margin: 2px 0; font-size: 12px; color: #666; }
                    
                    .report-title { text-align: right; }
                    .report-title h2 { margin: 0; color: #333; }
                    .report-title p { margin: 2px 0; font-size: 12px; }

                    /* Table Styling */
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { 
                        background-color: #f8fafc; 
                        color: #475569; 
                        font-weight: bold; 
                        text-transform: uppercase;
                        font-size: 11px;
                        border-bottom: 2px solid #e2e8f0;
                        padding: 12px 8px;
                    }
                    td { 
                        padding: 10px 8px; 
                        border-bottom: 1px solid #edf2f7; 
                        text-align: center; 
                    }
                    tr:nth-child(even) { background-color: #fcfcfc; }

                    /* Utility Classes */
                    .amount { font-weight: bold; color: #111827; }
                    .order-id { color: #2563eb; font-family: monospace; font-weight: bold; }
                    .badge {
                        background: #f1f5f9;
                        padding: 2px 6px;
                        border-radius: 4px;
                        text-transform: capitalize;
                        font-size: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="shop-info">
                        <h1>DEMO LAUNDRY</h1>
                        <p>123 Business Avenue, Suite 400</p>
                        <p>Nashik, Maharashtra - 422001</p>
                        <p>Phone: +91 98765 43210</p>
                    </div>
                    <div class="report-title">
                        <h2>Payment Report</h2>
                        <p>Generated on: ${new Date().toLocaleString()}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%">Sr.</th>
                            <th style="width: 12%">Date</th>
                            <th style="width: 12%">Order ID</th>
                            <th style="width: 18%">Customer</th>
                            <th style="width: 15%">Driver</th>
                            <th style="width: 12%">Amount</th>
                            <th style="width: 12%">Method</th>
                            <th style="width: 14%">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });

        await browser.close();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=payment-report.pdf");
        res.send(pdfBuffer);

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
        const {
            start_date,
            end_date,
            services_list,   // service name (Cap, Shirt...)
            services_types,  // service type (Re-Wash, Washing...)
            driver_name
        } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: "start_date and end_date are required"
            });
        }

        let whereClauses = [];
        let params = [];

        // 📅 Date filter
        whereClauses.push("DATE(order_date) BETWEEN ? AND ?");
        params.push(start_date, end_date);

        // 🚚 Driver filter
        if (driver_name) {
            whereClauses.push("driver_name = ?");
            params.push(driver_name);
        }

        const whereSQL = whereClauses.length
            ? `WHERE ${whereClauses.join(" AND ")}`
            : "";

        // 🔹 STEP 1: Fetch orders only
        const query = `
      SELECT
        order_code,
        order_date,
        driver_name,
        item_list
      FROM orders
      ${whereSQL}
      ORDER BY order_date DESC
    `;

        const [orders] = await db.query(query, params);

        // 🔹 STEP 2: Explode item_list JSON in Node.js
        let reportRows = [];

        for (const order of orders) {
            let items = [];

            try {
                items = Array.isArray(order.item_list)
                    ? order.item_list
                    : JSON.parse(order.item_list);
            } catch (e) {
                console.error("Invalid item_list JSON for order:", order.order_code);
                continue;
            }

            for (const item of items) {
                // 👕 service filter
                if (services_list && item.name !== services_list) continue;

                // 🧺 service type filter
                if (services_types && item.type !== services_types) continue;

                reportRows.push({
                    date: order.order_date,
                    order_code: order.order_code,
                    driver_name: order.driver_name,
                    service_name: item.name,
                    service_type: item.type,
                    service_qty: Number(item.qty) || 0
                });
            }
        }

        // 🔢 Summary
        const totalQty = reportRows.reduce(
            (sum, r) => sum + r.service_qty,
            0
        );

        return res.json({
            success: true,
            summary: {
                total_records: reportRows.length,
                total_qty: totalQty
            },
            data: reportRows
        });

    } catch (err) {
        console.error("Cloth Wise Report Error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch Cloth Wise report",
            error: err.message
        });
    }
};


exports.printClothWiseReport = async (req, res) => {
    try {
        const { start_date, end_date, services_list, services_types, driver_name } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({ success: false, message: "Dates are required" });
        }

        let whereClauses = ["DATE(order_date) BETWEEN ? AND ?"];
        let params = [start_date, end_date];

        if (driver_name) {
            whereClauses.push("driver_name = ?");
            params.push(driver_name);
        }

        const query = `
            SELECT order_code, order_date, driver_name, item_list
            FROM orders
            WHERE ${whereClauses.join(" AND ")}
            ORDER BY order_date DESC
        `;

        const [orders] = await db.query(query, params);

        let reportRows = [];
        for (const order of orders) {
            let items = [];
            try {
                items = Array.isArray(order.item_list) ? order.item_list : JSON.parse(order.item_list);
            } catch { continue; }

            for (const item of items) {
                if (services_list && item.name !== services_list) continue;
                if (services_types && item.type !== services_types) continue;

                reportRows.push({
                    date: new Date(order.order_date).toLocaleDateString(),
                    order_code: order.order_code,
                    driver_name: order.driver_name || 'N/A',
                    service_name: item.name,
                    service_type: item.type,
                    service_qty: Number(item.qty) || 0
                });
            }
        }

        const totalQty = reportRows.reduce((sum, r) => sum + r.service_qty, 0);

        const tableRows = reportRows.map((row, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${row.date}</td>
                <td class="order-id">${row.order_code}</td>
                <td>${row.driver_name}</td>
                <td style="text-align: left;">${row.service_name}</td>
                <td><span class="type-tag">${row.service_type}</span></td>
                <td class="bold">${row.service_qty}</td>
            </tr>
        `).join("");

        const html = `
        <html>
        <head>
            <style>
                @page { size: A4; margin: 10mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; }
                
                /* Header Styling */
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1a56db; padding-bottom: 10px; margin-bottom: 20px; }
                .header h2 { margin: 0; color: #1a56db; text-transform: uppercase; font-size: 18px; }
                .shop-address { font-size: 10px; color: #666; text-align: right; }

                /* Summary Grid */
                .summary-container { display: flex; gap: 15px; margin-bottom: 20px; }
                .summary-card { 
                    flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; 
                    padding: 8px 12px; border-radius: 6px; 
                }
                .summary-card label { display: block; font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; }
                .summary-card span { font-size: 13px; font-weight: bold; color: #0f172a; }

                /* Compact Table Styling */
                table { width: 100%; border-collapse: collapse; font-size: 10.5px; } /* Reduced font size */
                th { 
                    background-color: #f1f5f9; color: #475569; font-weight: bold; 
                    text-transform: uppercase; font-size: 9px; 
                    padding: 6px 4px; border: 1px solid #e2e8f0;
                }
                td { 
                    padding: 5px 4px; border: 1px solid #e2e8f0; text-align: center;
                    white-space: nowrap; /* Prevents awkward wrapping */
                }
                tr:nth-child(even) { background-color: #f8fafc; }

                /* Helper Classes */
                .order-id { font-family: monospace; font-weight: bold; color: #2563eb; }
                .type-tag { font-size: 9px; background: #e0f2fe; color: #0369a1; padding: 2px 5px; border-radius: 3px; }
                .bold { font-weight: bold; }
                footer { position: fixed; bottom: 0; width: 100%; font-size: 9px; color: #94a3b8; text-align: right; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h2>DEMO LAUNDRY SERVICE CO.</h2>
                    123 Cleaner Street, Dubai, UAE<br/>
                    Phone: +971 4 000 0000
                </div>
                <div class="shop-address">
                    <h2> Cloth Wise Report</h2>
                    <p style="font-size: 11px; margin: 2px 0;">Generated for: ${start_date} to ${end_date}</p>
                </div>
            </div>

            <div class="summary-container">
                <div class="summary-card"><label>Total Quantity</label><span>${totalQty} Items</span></div>
                <div class="summary-card"><label>Total Transactions</label><span>${reportRows.length}</span></div>
                <div class="summary-card"><label>Report Date</label><span>${new Date().toLocaleDateString()}</span></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px">Sr.</th>
                        <th>Date</th>
                        <th>Order Code</th>
                        <th>Driver</th>
                        <th>Service Name</th>
                        <th>Type</th>
                        <th style="width: 50px">Qty</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || `<tr><td colspan="7">No records found matching criteria</td></tr>`}
                </tbody>
            </table>

            <footer>Printed on: ${new Date().toLocaleString()}</footer>
            <script>window.onload = () => { window.print(); }</script>
        </body>
        </html>
        `;

        const browser = await puppeteer.launch({
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" }
        });

        await browser.close();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=cloth-report.pdf");
        res.send(pdfBuffer);

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// exports.printClothWiseReport = async (req, res) => {
//     try {
//         const {
//             start_date,
//             end_date,
//             services_list,
//             services_types,
//             driver_name
//         } = req.query;

//         if (!start_date || !end_date) {
//             return res.status(400).json({
//                 success: false,
//                 message: "start_date and end_date are required"
//             });
//         }

//         let whereClauses = [];
//         let params = [];

//         // 📅 Date filter
//         whereClauses.push("DATE(order_date) BETWEEN ? AND ?");
//         params.push(start_date, end_date);

//         // 🚚 Driver filter
//         if (driver_name) {
//             whereClauses.push("driver_name = ?");
//             params.push(driver_name);
//         }

//         const whereSQL = whereClauses.length
//             ? `WHERE ${whereClauses.join(" AND ")}`
//             : "";

//         // 🔹 Fetch orders
//         const query = `
//             SELECT order_code, order_date, driver_name, item_list
//             FROM orders
//             ${whereSQL}
//             ORDER BY order_date DESC
//         `;

//         const [orders] = await db.query(query, params);

//         // 🔹 Parse items
//         let reportRows = [];

//         for (const order of orders) {
//             let items = [];

//             try {
//                 items = Array.isArray(order.item_list)
//                     ? order.item_list
//                     : JSON.parse(order.item_list);
//             } catch {
//                 continue;
//             }

//             for (const item of items) {
//                 if (services_list && item.name !== services_list) continue;
//                 if (services_types && item.type !== services_types) continue;

//                 reportRows.push({
//                     date: order.order_date,
//                     order_code: order.order_code,
//                     driver_name: order.driver_name,
//                     service_name: item.name,
//                     service_type: item.type,
//                     service_qty: Number(item.qty) || 0
//                 });
//             }
//         }

//         // 🔢 Summary
//         const totalQty = reportRows.reduce((sum, r) => sum + r.service_qty, 0);

//         // 🧾 Table rows HTML
//         const tableRows = reportRows.map((row, i) => `
//             <tr>
//                 <td>${i + 1}</td>
//                 <td>${row.date}</td>
//                 <td>${row.order_code}</td>
//                 <td>${row.driver_name}</td>
//                 <td>${row.service_name}</td>
//                 <td>${row.service_type}</td>
//                 <td>${row.service_qty}</td>
//             </tr>
//         `).join("");

//         // 📄 HTML template
//         const html = `
//         <html>
//         <head>
//             <style>
//                 body { font-family: Arial; padding: 20px; }
//                 h2 { text-align: center; margin-bottom: 5px; }
//                 .summary { text-align: center; margin-bottom: 15px; font-size: 14px; }
//                 table { width: 100%; border-collapse: collapse; }
//                 th, td { border: 1px solid #000; padding: 8px; text-align: center; }
//                 th { background: #f2f2f2; }
//                 footer { margin-top: 20px; text-align: right; font-size: 12px; }
//             </style>
//         </head>
//         <body>
//             <h2>Cloth Wise Report</h2>
//             <div class="summary">
//                 <strong>Date Range:</strong> ${start_date} → ${end_date} <br/>
//                 <strong>Total Records:</strong> ${reportRows.length} |
//                 <strong>Total Quantity:</strong> ${totalQty}
//             </div>

//             <table>
//                 <thead>
//                     <tr>
//                         <th>Sr No</th>
//                         <th>Date</th>
//                         <th>Order Code</th>
//                         <th>Driver</th>
//                         <th>Service</th>
//                         <th>Service Type</th>
//                         <th>Qty</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${tableRows || `<tr><td colspan="7">No data found</td></tr>`}
//                 </tbody>
//             </table>

//             <footer>
//                 Generated on: ${new Date().toLocaleString()}
//             </footer>
//         </body>
//         </html>
//         `;

//         // 🚀 Puppeteer launch
//         const browser = await puppeteer.launch({
//             headless: "new",
//             args: ["--no-sandbox", "--disable-setuid-sandbox"]
//         });

//         const page = await browser.newPage();
//         await page.setContent(html, { waitUntil: "networkidle0" });

//         // 📥 Generate PDF
//         const pdfBuffer = await page.pdf({
//             format: "A4",
//             printBackground: true,
//             margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" }
//         });

//         await browser.close();

//         // 📤 Send PDF
//         res.setHeader("Content-Type", "application/pdf");
//         res.setHeader(
//             "Content-Disposition",
//             `attachment; filename=cloth-wise-report-${start_date}-to-${end_date}.pdf`
//         );

//         res.send(pdfBuffer);

//     } catch (err) {
//         console.error("Print Cloth Wise Report Error:", err);
//         res.status(500).json({
//             success: false,
//             message: "Failed to generate Cloth Wise PDF",
//             error: err.message
//         });
//     }
// };
