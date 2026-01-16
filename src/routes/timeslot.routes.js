
const express = require("express");
const router = express.Router();

const {
    createTimeSlot,
    getAllTimeSlots,
    getTimeSlotById,
    updateTimeSlot,
    deleteTimeSlot

} = require("../controllers/timeslot.controller");


// Create
router.post("/create", createTimeSlot);

//get all 
router.get("/list", getAllTimeSlots);

//get by id
router.get("/:id", getTimeSlotById);

//update
router.put("/update/:id", updateTimeSlot);

//delete
router.delete("delete/:id", deleteTimeSlot);


module.exports = router;
