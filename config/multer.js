const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 👉 Dynamic storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check path or originalUrl to decide folder
    const isServiceType = req.originalUrl.includes("service_types");
    const folderName = isServiceType ? "servicesTypes" : "services";

    const uploadPath = path.join(__dirname, "..", "uploads", folderName);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Remove spaces from filenames to prevent URL issues
    const cleanFileName = file.originalname.replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${cleanFileName}`);
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
