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


// app.get('',
exports.getExcelReport = async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const [rows] = await db.query("SELECT * FROM orders WHERE order_date BETWEEN ? AND ?", [startDate, endDate]);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Daily Report');

        // Define Columns
        worksheet.columns = [
            { header: 'Order ID', key: 'id', width: 10 },
            { header: 'Customer', key: 'customer_name', width: 20 },
            { header: 'Amount', key: 'total_amount', width: 15 },
            { header: 'Date', key: 'order_date', width: 15 }
        ];

        // Add Data
        worksheet.addRows(rows);

        // Set Headers & Send
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=report_${startDate}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).send(error.message);
    }
};




exports.printDailyReport = async (req, res) => {
    const { startDate, endDate } = req.query;

    try {
        // 1. FETCH DATA (Example query based on your UI)
        // You would replace this with actual logic to sum orders, sales, etc.
        const [rows] = await db.query(`
            SELECT 
                'Orders' as Particulars, COUNT(id) as Value FROM orders WHERE order_date BETWEEN ? AND ?
            UNION ALL
            SELECT 
                'Total Sales' as Particulars, CONCAT('AED ', COALESCE(SUM(total_amount), 0)) as Value FROM orders WHERE order_date BETWEEN ? AND ?
            -- Add other UNIONs for Payment, Expense, etc.
        `, [startDate, endDate, startDate, endDate]);

        // 2. GENERATE TABLE ROWS
        const reportRows = rows.map((item, i) => `
            <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td style="text-align: left; padding-left: 15px;">${item.Particulars}</td>
                <td style="text-align: right; padding-right: 15px; font-weight: bold;">${item.Value}</td>
            </tr>
        `).join("");

        // Fill empty rows to maintain layout
        const emptyRows = Array(Math.max(0, 10 - rows.length))
            .fill('<tr><td style="height:35px;"></td><td></td><td></td></tr>')
            .join("");

        // 3. HTML TEMPLATE
        const html = `
<!DOCTYPE html>
<html>
<head>
<style>
    @page { size: A4; margin: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #fff; }
    .page { width: 210mm; height: 297mm; padding: 15mm; box-sizing: border-box; }
    
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    .business-name { font-size: 24px; font-weight: bold; color: #1a365d; margin: 0; }
    .report-title { background: #56CCFF; padding: 8px 20px; border-radius: 5px; font-weight: bold; }

    .meta-info { margin-bottom: 20px; font-size: 14px; display: flex; justify-content: space-between; }

    .grid-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .grid-table th { background: #56CCFF; color: #000; padding: 12px; border: 1px solid #000; text-transform: uppercase; font-size: 13px; }
    .grid-table td { border: 1px solid #ccc; padding: 10px; border: 1px solid #000; font-size: 14px; }
    
    .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; color: #666; }
    .stamp { margin-top: 40px; text-align: right; font-weight: bold; font-size: 14px; }
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div>
            <h1 class="business-name">The Ceramic Studio</h1>
            <p style="font-size: 10px; margin: 5px 0;">Daily Performance & Accounts Summary Report</p>
        </div>
        <div class="report-title">DAILY REPORT</div>
    </div>

    <div class="meta-info">
        <div><strong>Date Range:</strong> ${startDate} to ${endDate}</div>
        <div><strong>Generated On:</strong> ${new Date().toLocaleString()}</div>
    </div>

    <table class="grid-table">
        <thead>
            <tr>
                <th width="10%">Sr.</th>
                <th width="60%">Particulars</th>
                <th width="30%">Value</th>
            </tr>
        </thead>
        <tbody>
            ${reportRows}
            ${emptyRows}
        </tbody>
    </table>

    <div class="stamp">
        <br><br>
        <p>Authorized Signature</p>
    </div>

    <div class="footer">
        <div>This is a system generated report.</div>
        <div>Page 1 of 1</div>
    </div>
</div>
</body>
</html>`;

        // 4. CONVERT TO PDF
        const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdf = await page.pdf({ format: "A4", printBackground: true });
        await browser.close();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename=DailyReport.pdf`,
        });
        res.send(pdf);

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

