const express = require("express");
const router = express.Router();
const upload = require("../../config/multer");

const {
    createServiceType,
    updateServiceType,
    deleteServiceType,
    getAllServiceTypes,
    getServiceTypeById,
    createServiceCategory,
    getServiceCategoryById,
    updateServiceCategory,
    deleteServiceCategory,
    getAllServiceCategory,
    createServiceAddon,
    getAllServiceaddon,
    getServiceAddonById,
    updateServiceaddon,
    deleteServiceAddon,
} = require("../controllers/service.controller");

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof require('multer').MulterError) {
        console.error("Multer error:", err);
        return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}. Expected field name: 'icon'`,
            error: err.message
        });
    }
    next(err);
};

// = = = = =  Service Type Routes = = = = = //
router.post("/service_types/create", upload.single("icon"), createServiceType);
router.get("/service_types/list", getAllServiceTypes);
router.get("/service_types/list/:id", getServiceTypeById);
router.put("/service_types/update/:id", upload.single("icon"), updateServiceType);
router.delete("/service_types/delete/:id", deleteServiceType);
// = = = = =  Service Category Routes = = = = = //
router.post("/service_categories/create", createServiceCategory);
router.get("/service_categories/list", getAllServiceCategory);
router.get("/service_categories/list/:id", getServiceCategoryById);
router.put("/service_categories/update/:id", updateServiceCategory);
router.delete("/service_categories/delete/:id", deleteServiceCategory);

// = = = = =  Service Addon Routes = = = = = //
router.post("/service_addon/create", createServiceAddon);
router.get("/service_addon/list", getAllServiceaddon);
router.get("/service_addon/list/:id", getServiceAddonById);
router.put("/service_addon/update/:id", updateServiceaddon);
router.delete("/service_addon/delete/:id", deleteServiceAddon);

module.exports = router;
