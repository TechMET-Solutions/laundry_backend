const express = require("express");
const router = express.Router();

const {
  createEmirate,
  getAllEmirates,
  getEmirateById,
  updateEmirate,
  deleteEmirate,
} = require("../controllers/locationManagement.controller");

router.post("/create", createEmirate);
router.get("/list", getAllEmirates);
router.get("/:id", getEmirateById);
router.put("/:id", updateEmirate);
router.delete("/:id", deleteEmirate);

module.exports = router;
