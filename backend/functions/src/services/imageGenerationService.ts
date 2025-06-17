import * as admin from "firebase-admin";
import OpenAI from "openai";
import {uploadImageFromUrl} from "./storageService";
import {v4 as uuidv4} from "uuid";
import {checkDailyImageLimit, incrementDailyImageCount} from "./schedulerService";
import * as dotenv from "dotenv";

dotenv.config();

const db = admin.firestore();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export enum ImageStyle {
  VIVID = "vivid",
  NATURAL = "natural"
}

export enum ImageSize {
  SQUARE = "1024x1024",
  PORTRAIT = "1024x1792",
  LANDSCAPE = "1792x1024"
}

export enum ImageQuality {
  STANDARD = "standard",
  HD = "hd"
}

export interface ImageGenerationRequest {
  prompt: string;
  style?: ImageStyle;
  size?: ImageSize;
  quality?: ImageQuality;
  userId?: string;
  quizId?: string;
  purpose?: "quiz" | "test" | "admin" | "user_request";
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  revisedPrompt?: string;
  originalUrl: string;
  storageUrl?: string;
  fileName: string;
  style: ImageStyle;
  size: ImageSize;
  quality: ImageQuality;
  purpose: string;
  userId?: string;
  quizId?: string;
  generatedAt: Date;
  uploadedAt?: Date;
  metadata: {
    model: string;
    estimatedCost: number;
    processingTime: number;
  };
  status: "generating" | "generated" | "uploaded" | "failed";
  error?: string;
}

/**
 * DALL-E 3を使って画像を生成
 */
export const generateImage = async (request: ImageGenerationRequest): Promise<GeneratedImage> => {
  const startTime = Date.now();
  const imageId = uuidv4();

  console.log(`🎨 Starting image generation: ${imageId}`);
  console.log(`📝 Prompt: ${request.prompt}`);

  // Check daily image generation limit first
  const limitCheck = await checkDailyImageLimit();
  if (!limitCheck.canGenerate) {
    const reason = !limitCheck.canGenerate ?
      "Daily limit exceeded or OpenAI API disabled" :
      "OpenAI API disabled";
    throw new Error(
      `Image generation blocked: ${reason}. Remaining: ${limitCheck.remaining}/${limitCheck.limit}`
    );
  }

  console.log(`📊 Image generation limit check: ${limitCheck.remaining}/${limitCheck.limit} remaining`);

  // Create initial record
  const generatedImage: GeneratedImage = {
    id: imageId,
    prompt: request.prompt,
    originalUrl: "",
    fileName: `${imageId}.png`,
    style: request.style || ImageStyle.VIVID,
    size: request.size || ImageSize.SQUARE,
    quality: request.quality || ImageQuality.STANDARD,
    purpose: request.purpose || "user_request",
    userId: request.userId,
    quizId: request.quizId,
    generatedAt: new Date(),
    metadata: {
      model: "dall-e-3",
      estimatedCost: 0,
      processingTime: 0,
    },
    status: "generating",
  };

  try {
    // Save initial record
    await saveGeneratedImage(generatedImage);

    // Generate image with DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: request.prompt,
      n: 1,
      size: request.size || ImageSize.SQUARE,
      quality: request.quality || ImageQuality.STANDARD,
      style: request.style || ImageStyle.VIVID,
    });

    const imageData = response.data[0];
    if (!imageData.url) {
      throw new Error("No image URL returned from OpenAI");
    }

    // Calculate processing time and cost
    const processingTime = Date.now() - startTime;
    const estimatedCost = calculateCost(request.quality || ImageQuality.STANDARD, request.size || ImageSize.SQUARE);

    // Update record with generation results
    generatedImage.originalUrl = imageData.url;
    generatedImage.revisedPrompt = imageData.revised_prompt;
    generatedImage.status = "generated";
    generatedImage.metadata.processingTime = processingTime;
    generatedImage.metadata.estimatedCost = estimatedCost;

    await saveGeneratedImage(generatedImage);

    // Increment daily image count after successful generation
    await incrementDailyImageCount();

    console.log(`✅ Image generated successfully: ${imageId}`);
    console.log(`⏱️ Processing time: ${processingTime}ms`);
    console.log(`💰 Estimated cost: $${estimatedCost}`);

    return generatedImage;
  } catch (error) {
    console.error(`❌ Error generating image ${imageId}:`, error);

    // Update record with error
    generatedImage.status = "failed";
    generatedImage.error = (error as Error).message;
    generatedImage.metadata.processingTime = Date.now() - startTime;

    await saveGeneratedImage(generatedImage);
    throw error;
  }
};

/**
 * 生成された画像をFirebase Storageにアップロード
 */
export const uploadGeneratedImage = async (imageId: string): Promise<GeneratedImage> => {
  console.log(`📤 Starting upload for image: ${imageId}`);

  const generatedImage = await getGeneratedImage(imageId);
  if (!generatedImage) {
    throw new Error("Generated image not found");
  }

  if (generatedImage.status !== "generated") {
    throw new Error(`Image not ready for upload. Status: ${generatedImage.status}`);
  }

  try {
    // Upload to Firebase Storage
    await uploadImageFromUrl(generatedImage.originalUrl, generatedImage.id);

    // Update record
    generatedImage.status = "uploaded";
    generatedImage.uploadedAt = new Date();
    generatedImage.storageUrl = `images/${generatedImage.fileName}`;

    await saveGeneratedImage(generatedImage);

    console.log(`✅ Image uploaded successfully: ${imageId}`);
    return generatedImage;
  } catch (error) {
    console.error(`❌ Error uploading image ${imageId}:`, error);

    generatedImage.status = "failed";
    generatedImage.error = `Upload failed: ${(error as Error).message}`;

    await saveGeneratedImage(generatedImage);
    throw error;
  }
};

/**
 * 画像生成とアップロードを一括実行
 */
export const generateAndUploadImage = async (request: ImageGenerationRequest): Promise<GeneratedImage> => {
  console.log("🚀 Starting complete image generation and upload process");

  try {
    // Generate image
    const generatedImage = await generateImage(request);

    // Upload to storage
    const uploadedImage = await uploadGeneratedImage(generatedImage.id);

    console.log(`🎉 Complete image generation and upload finished: ${generatedImage.id}`);
    return uploadedImage;
  } catch (error) {
    console.error("Error in complete image generation process:", error);
    throw error;
  }
};

/**
 * プロンプトの最適化
 */
export const optimizePrompt = async (originalPrompt: string): Promise<string> => {
  try {
    const optimizationPrompt = `
以下のプロンプトをDALL-E 3での画像生成に最適化してください。
- より具体的で詳細な描写にする
- 芸術的なスタイルを追加する
- 色彩や構図に関する指示を含める
- 50-100文字程度に収める

元のプロンプト: "${originalPrompt}"

最適化されたプロンプトのみを返してください。
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{role: "user", content: optimizationPrompt}],
      max_tokens: 150,
      temperature: 0.7,
    });

    const optimizedPrompt = response.choices[0]?.message?.content?.trim();
    return optimizedPrompt || originalPrompt;
  } catch (error) {
    console.error("Error optimizing prompt:", error);
    return originalPrompt; // Return original if optimization fails
  }
};

/**
 * ランダムなクイズ用プロンプトを生成
 */
export const generateRandomQuizPrompt = async (): Promise<string> => {
  const promptTemplates = [
    "50文字程度のランダムで意味のない文章を1つ作成してください",
    "面白くて想像力をかき立てる短いフレーズを作成してください（50文字以内）",
    "日常的ではない奇妙な状況を描いた短い文章を作成してください（50文字以内）",
    "色彩豊かで視覚的な短いイメージを描いた文章を作成してください（50文字以内）",
  ];

  const randomTemplate = promptTemplates[Math.floor(Math.random() * promptTemplates.length)];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{role: "user", content: randomTemplate}],
      max_tokens: 100,
      temperature: 0.9,
    });

    const generatedPrompt = response.choices[0]?.message?.content?.trim();
    return generatedPrompt || "色鮮やかな抽象的なアート";
  } catch (error) {
    console.error("Error generating random prompt:", error);
    return "色鮮やかな抽象的なアート"; // Fallback
  }
};

/**
 * 画像生成コストを計算
 */
const calculateCost = (quality: ImageQuality, size: ImageSize): number => {
  // DALL-E 3 pricing (2024年価格)
  const baseCost = quality === ImageQuality.HD ? 0.080 : 0.040; // USD per image

  // Size multiplier
  const sizeMultiplier = size === ImageSize.SQUARE ? 1.0 : 1.2; // Non-square costs more

  return baseCost * sizeMultiplier;
};

/**
 * 生成画像をFirestoreに保存
 */
const saveGeneratedImage = async (generatedImage: GeneratedImage): Promise<void> => {
  try {
    const imageRef = db.collection("generated_images").doc(generatedImage.id);
    await imageRef.set({
      ...generatedImage,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      uploadedAt: generatedImage.uploadedAt ? admin.firestore.FieldValue.serverTimestamp() : null,
    });
  } catch (error) {
    console.error("Error saving generated image:", error);
    throw error;
  }
};

/**
 * 生成画像を取得
 */
export const getGeneratedImage = async (imageId: string): Promise<GeneratedImage | null> => {
  try {
    const imageRef = db.collection("generated_images").doc(imageId);
    const doc = await imageRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data()!;
    return {
      ...data,
      generatedAt: data.generatedAt?.toDate() || new Date(),
      uploadedAt: data.uploadedAt?.toDate() || undefined,
    } as GeneratedImage;
  } catch (error) {
    console.error("Error getting generated image:", error);
    return null;
  }
};

/**
 * 画像生成履歴を取得
 */
export const getImageGenerationHistory = async (
  limit = 50,
  userId?: string,
  purpose?: string
): Promise<{ images: GeneratedImage[], hasMore: boolean }> => {
  try {
    let query = db.collection("generated_images")
      .orderBy("generatedAt", "desc")
      .limit(limit + 1);

    if (userId) {
      query = query.where("userId", "==", userId);
    }

    if (purpose) {
      query = query.where("purpose", "==", purpose);
    }

    const snapshot = await query.get();
    const images = snapshot.docs.slice(0, limit).map((doc) => {
      const data = doc.data();
      return {
        ...data,
        generatedAt: data.generatedAt?.toDate() || new Date(),
        uploadedAt: data.uploadedAt?.toDate() || undefined,
      } as GeneratedImage;
    });

    const hasMore = snapshot.docs.length > limit;

    return {images, hasMore};
  } catch (error) {
    console.error("Error getting image generation history:", error);
    return {images: [], hasMore: false};
  }
};

/**
 * 画像生成統計を取得
 */
export const getImageGenerationStats = async (period: "day" | "week" | "month" = "week"): Promise<{
  totalGenerated: number;
  totalUploaded: number;
  totalFailed: number;
  totalCost: number;
  averageProcessingTime: number;
  successRate: number;
}> => {
  try {
    const now = new Date();
    const periodStart = new Date();

    switch (period) {
    case "day":
      periodStart.setDate(now.getDate() - 1);
      break;
    case "week":
      periodStart.setDate(now.getDate() - 7);
      break;
    case "month":
      periodStart.setMonth(now.getMonth() - 1);
      break;
    }

    const snapshot = await db.collection("generated_images")
      .where("generatedAt", ">=", periodStart)
      .get();

    const images = snapshot.docs.map((doc) => doc.data() as GeneratedImage);

    const totalGenerated = images.length;
    const totalUploaded = images.filter((img) => img.status === "uploaded").length;
    const totalFailed = images.filter((img) => img.status === "failed").length;
    const totalCost = images.reduce((sum, img) => sum + img.metadata.estimatedCost, 0);
    const averageProcessingTime = images.length > 0 ?
      images.reduce((sum, img) => sum + img.metadata.processingTime, 0) / images.length :
      0;
    const successRate = totalGenerated > 0 ? (totalUploaded / totalGenerated) * 100 : 0;

    return {
      totalGenerated,
      totalUploaded,
      totalFailed,
      totalCost,
      averageProcessingTime,
      successRate,
    };
  } catch (error) {
    console.error("Error getting image generation stats:", error);
    return {
      totalGenerated: 0,
      totalUploaded: 0,
      totalFailed: 0,
      totalCost: 0,
      averageProcessingTime: 0,
      successRate: 0,
    };
  }
};
