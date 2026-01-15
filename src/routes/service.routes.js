const express = require("express");
const router = express.Router();

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

// = = = = =  Service Type Routes = = = = = //
router.post("/types/create", createServiceType);
router.get("/types/list", getAllServiceTypes);
router.get("/types/list/:id", getServiceTypeById);
router.put("/types/update/:id", updateServiceType);
router.delete("/types/delete/:id", deleteServiceType);

// = = = = =  Service Category Routes = = = = = //
router.post("/categories/create", createServiceCategory);
router.get("/categories/list", getAllServiceCategory);
router.get("/categories/list/:id", getServiceCategoryById);
router.put("/categories/update/:id", updateServiceCategory);
router.delete("/categories/delete/:id", deleteServiceCategory);

// = = = = =  Service Addon Routes = = = = = //
router.post("/addon/create", createServiceAddon);
router.get("/addon/list", getAllServiceaddon);
router.get("/addon/list/:id", getServiceAddonById);
router.put("/addon/update/:id", updateServiceaddon);
router.delete("/addon/delete/:id", deleteServiceAddon);

module.exports = router;
