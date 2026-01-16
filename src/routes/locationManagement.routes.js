const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationManagement.controller");

const {createEmirate,getAllEmirates,getEmirateById,updateEmirate ,deleteEmirate} = require("../controllers/locationManagement.controller"); 

// ==================== EMIRATES ROUTES ====================
router.post("/emirates/create",  createEmirate);
router.get("/emirates/list", getAllEmirates);
router.get("/emirates/list/:id",  getEmirateById);
router.put("/emirates/update/:id",  updateEmirate);
router.delete("/emirates/delete/:id", deleteEmirate);
// ==================== AREAS ROUTES ====================
router.post("/areas/create", locationController.createArea);
router.get("/areas/list", locationController.getAllAreas);
router.get("/areas/:id", locationController.getAreaById); 
router.put("/areas/update/:id", locationController.updateArea);
router.delete("/areas/delete/:id", locationController.deleteArea);

module.exports = router;
