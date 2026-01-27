const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 👉 Dynamic storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadFolder = "services"; // default

    if (req.baseUrl.includes("/service_types")) {
      uploadFolder = "servicesTypes";
    } else if (req.baseUrl.includes("/service_list")) {
      uploadFolder = "services";
    }

    const uploadPath = path.join(__dirname, "..", "uploads", uploadFolder);

    // Auto-create folder if missing
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// 👉 File validation
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const ext = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (ext) cb(null, true);
  else cb(new Error("Only image files allowed"));
};

module.exports = multer({ storage, fileFilter });
