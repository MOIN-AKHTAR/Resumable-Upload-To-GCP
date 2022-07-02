const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  keyFilename: "google-storage-key.json",
});

async function configureBucketCors() {
  const [metadata] = await storage
    .bucket(process.env.BUCKET_NAME)
    .getMetadata();
  if (!metadata.cors) {
    await storage.bucket(process.env.BUCKET_NAME).setCorsConfiguration([
      {
        origin: [process.env.OTHER_ORIGIN],
        responseHeader: [
          "Content-Type",
          "Access-Control-Allow-Origin",
          "X-Upload-Content-Length",
          "X-Goog-Resumable",
        ],
        method: ["PUT", "OPTIONS", "POST"],
        maxAgeSeconds: 3600,
      },
    ]);
  }
}

configureBucketCors().catch(console.error);

exports.storage = storage;
