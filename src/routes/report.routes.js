const express = require('express');
const { getExcelReport, getDailyReport, printDailyReport, getPaymentReport, printTaxReport } = require('../controllers/report.controller');

const router = express.Router();
// Payment Report API
router.get('/payments', getPaymentReport);

// 1. Daily Reports API
router.get('/daily', getDailyReport);
router.get('/download', getExcelReport);
router.get('/print', printDailyReport);

router.get('/tax', printTaxReport);
module.exports = router;