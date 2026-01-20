const express = require("express");
const router = express.Router();
const upload = require("../../config/multer");

const {createServiceList, getServiceList ,updateServiceList,deleteServiceList } = require("../controllers/servicelist.controller");

// = = = = =  Service List Route = = = = = //
router.post("/create", upload.single("addIcon"), createServiceList);
router.put("/update/:id", upload.single("addIcon"), updateServiceList);
router.delete("/delete/:id", deleteServiceList);
router.get("/list", getServiceList);

module.exports = router;