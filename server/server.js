const express = require("express");
const cors = require("cors");
require("dotenv").config({
  path: ".env",
});
const { storage } = require("./config");

const app = express();
app.use(
  cors({
    origin: "*",
  })
);

app.route("/getSignedUrl").get(async (req, res, next) => {
  try {
    const [url] = await storage
      .bucket(process.env.BUCKET_NAME)
      .file(req.query.fileName)
      .getSignedUrl({
        action: "resumable",
        version: "v4",
        expires: Date.now() + 12 * 60 * 60 * 1000,
        contentType: "application/octet-stream",
      });
    return res.json({
      url,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error,
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
