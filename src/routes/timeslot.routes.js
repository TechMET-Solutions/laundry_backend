
const express = require("express");
const router = express.Router();

const {
    createTimeSlot,
    getAllTimeSlots,
    getTimeSlotById

} = require("../controllers/timeslot.controller");


// Create
router.post("/create", createTimeSlot);

// update
// router.put("/update", updateTimeSlot);

//get all 
router.get("/list", getAllTimeSlots)

//get by id
router.get("/:id", getTimeSlotById);


module.exports = router;
