const express = require('express');
const { getDailyReport, getPaymentReport, printTaxReport, getOrderReport, getSalesReport } = require('../controllers/report.controller');

const router = express.Router();
// Payment Report API
router.get('/payments', getPaymentReport);

// 1. Daily Reports API
router.get('/daily', getDailyReport);
router.get('/orders', getOrderReport);
router.get('/sales', getSalesReport);

router.get('/tax', printTaxReport);
module.exports = router;