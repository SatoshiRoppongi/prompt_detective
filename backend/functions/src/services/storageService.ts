// services/storageService.ts
import axios from "axios";
import * as admin from "firebase-admin";
// Why is admin.firestore.FieldValue undefined when running code in Firebase emulator
// https://stackoverflow.com/questions/72928353/

const bucket = admin.storage().bucket("gs://prompt-detective-backend.appspot.com");

export const getImageByName = async (name: string) => {
  // For development/testing, return placeholder images for demo data
  if (name === "demo-apple.jpg" || name === "test-apple.jpg") {
    return "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop";
  }

  const filePath = `images/${name}`;
  const file = bucket.file(filePath);

  try {
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "03-17-2025",
    });
    return url;
  } catch (error) {
    // Return a default placeholder image if file not found
    console.log(`File not found: ${filePath}, returning placeholder`);
    return "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop";
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

export const getLatestImage = async (): Promise<string> => {
  return "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop";
};
