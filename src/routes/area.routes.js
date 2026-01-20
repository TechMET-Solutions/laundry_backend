const express = require("express");
const router = express.Router();

const {
  createArea,
  getAllAreas,
  getAreaById,
  updateArea,
  deleteArea,
} = require("../controllers/area.controller");

// CREATE
router.post("/create", createArea);

// READ
router.get("/list", getAllAreas);
router.get("/list/:id", getAreaById);
// UPDATE
router.put("/update/:id", updateArea);

// DELETE
router.delete("/delete/:id", deleteArea);

module.exports = router;