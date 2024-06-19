// services/storageService.ts
import axios from "axios";
import * as admin from "firebase-admin";
// https://stackoverflow.com/questions/72928353/why-is-admin-firestore-fieldvalue-undefined-when-running-code-in-firebase-emulat
import {FieldValue} from "firebase-admin/firestore";
import {v4 as uuidv4} from "uuid";

const db = admin.firestore();

/*
admin.initializeApp({
  credential: admin.credential.cert(ServiceAccount as admin.ServiceAccount),
});
*/

const bucket = admin.storage().bucket("gs://prompt-detective-backend.appspot.com");

export const getImageByName = async (name: string) => {
  const filePath = `${name}.jpeg`;
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

export const uploadImageFromUrl = async (url: string) => {
  try {
    const randomName = uuidv4();
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

        // Firestoreにメタデータを保存
        // TODO: imagesではなく、問題を管理するproblemに紐づけるかも
        // なので以下は一旦仮
        await db.collection("images").doc(randomName).set({
          id: randomName,
          name: `${randomName}.jpg`,
          createdAt: FieldValue.serverTimestamp(),
        });
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
