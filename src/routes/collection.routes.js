const express = require("express");
const {
  createCollection,
  updateCollection,
  getAllCollections,
  deleteCollection,
} = require("../controllers/collection.controlers");

const router = express.Router();

// CREATE
router.post("/create", createCollection);

// GET ALL (pagination)
router.get("/list", getAllCollections);
router.put("/update/:id", updateCollection);

// DELETE (hard delete)
router.delete("/delete/:id", deleteCollection);


module.exports = router;
