// services/storageService.ts
import axios from "axios";
import * as admin from "firebase-admin";
// https://stackoverflow.com/questions/72928353/why-is-admin-firestore-fieldvalue-undefined-when-running-code-in-firebase-emulat

const bucket = admin.storage().bucket("gs://prompt-detective-backend.appspot.com");

export const getImageByName = async (name: string) => {
  const filePath = `images/${name}.jpg`;
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

// open aiから払い出されたurlから直接画像をstorageに格納する
export const uploadImageFromUrl = async (url: string, randomName: string) => {
  try {
    const destination = `images/${randomName}.jpg`;

    // URLから画像データを取得
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    // firebase storageにアップロード
    const file = bucket.file(destination);
    const stream = file.createWriteStream({
      metadata: {
        contentType: response.headers["content-type"],
      },
    });

    response.data.pipe(stream);

    return new Promise<void>((resolve, reject) => {
      stream.on("finish", async () => {
        console.log("Image uploaded successfully as", randomName);

        resolve();
      });
      stream.on("error", (error) => {
        console.log("Error uploading the image:", error);
        reject(error);
      });
    });
  } catch (error: any) {
    console.error("Error downloading the image:", error);
    throw new Error(`Failed to upload image from URL: ${error.message}`);
  }
};
