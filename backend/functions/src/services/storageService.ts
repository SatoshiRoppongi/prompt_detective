// services/storageService.ts
import * as admin from "firebase-admin";

/*
admin.initializeApp({
  credential: admin.credential.cert(ServiceAccount as admin.ServiceAccount),
});
*/

const bucket = admin.storage().bucket("gs://prompt-detective-backend.appspot.com");

export const getImageByDate = async (date: string) => {
  const filePath = `${date}.jpeg`;
  const file = bucket.file(filePath);

  try {
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-17-2025",
    });
    return url;
  } catch (error) {
    throw new Error(`File not found: ${filePath}`);
  }
};

export const getLatestImage = async () => {
  try {
    const [files] = await bucket.getFiles({prefix: "", autoPaginate: false});
    if (files.length === 0) {
      throw new Error("No files found in the bucket");
    }

    const latestFile = files
      .filter((file) => file.metadata.timeCreated)
      .sort((a, b) =>
        (b.metadata.timeCreated || "").localeCompare(
          a.metadata.timeCreated || ""
        )
      )[0];
    const [url] = await latestFile.getSignedUrl({
      action: "read",
      expires: "03-17-2025",
    });
    return url;
  } catch (error) {
    console.log("f");
    console.log(error);
    throw new Error("Failed to retrieve the latest file");
  }
};
