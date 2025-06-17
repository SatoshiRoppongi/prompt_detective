// controllers/imageController.ts
import {Request, Response} from "express";
import * as storageService from "../services/storageService";
import * as imageGenerationService from "../services/imageGenerationService";

/**
 * 画像URLを取得（既存機能）
 */
export const getImage = async (req: Request, res: Response): Promise<void> => {
  const {name} = req.query;
  console.log("name:", name);

  try {
    const imageUrl = await storageService.getImageByName(name as string);
    res.status(200).send({url: imageUrl});
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};

/**
 * DALL-E 3を使って新しい画像を生成
 */
export const generateImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      prompt,
      style,
      size,
      quality,
      userId,
      quizId,
      purpose,
      autoUpload,
    } = req.body;

    if (!prompt) {
      res.status(400).json({
        success: false,
        error: "Prompt is required",
      });
      return;
    }

    const request: imageGenerationService.ImageGenerationRequest = {
      prompt,
      style: style || imageGenerationService.ImageStyle.VIVID,
      size: size || imageGenerationService.ImageSize.SQUARE,
      quality: quality || imageGenerationService.ImageQuality.STANDARD,
      userId,
      quizId,
      purpose: purpose || "user_request",
    };

    let generatedImage;

    if (autoUpload !== false) {
      // Generate and upload in one step
      generatedImage = await imageGenerationService.generateAndUploadImage(request);
    } else {
      // Just generate
      generatedImage = await imageGenerationService.generateImage(request);
    }

    res.json({
      success: true,
      message: "Image generated successfully",
      data: generatedImage,
    });
  } catch (error: any) {
    console.error("Error in generateImage:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate image",
    });
  }
};

/**
 * 生成された画像をFirebase Storageにアップロード
 */
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const {imageId} = req.params;

    if (!imageId) {
      res.status(400).json({
        success: false,
        error: "Image ID is required",
      });
      return;
    }

    const uploadedImage = await imageGenerationService.uploadGeneratedImage(imageId);

    res.json({
      success: true,
      message: "Image uploaded successfully",
      data: uploadedImage,
    });
  } catch (error: any) {
    console.error("Error in uploadImage:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to upload image",
    });
  }
};

/**
 * プロンプトを最適化
 */
export const optimizePrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const {prompt} = req.body;

    if (!prompt) {
      res.status(400).json({
        success: false,
        error: "Prompt is required",
      });
      return;
    }

    const optimizedPrompt = await imageGenerationService.optimizePrompt(prompt);

    res.json({
      success: true,
      data: {
        original: prompt,
        optimized: optimizedPrompt,
      },
    });
  } catch (error: any) {
    console.error("Error in optimizePrompt:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to optimize prompt",
    });
  }
};

/**
 * ランダムなクイズ用プロンプトを生成
 */
export const generateRandomPrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const randomPrompt = await imageGenerationService.generateRandomQuizPrompt();

    res.json({
      success: true,
      data: {
        prompt: randomPrompt,
      },
    });
  } catch (error: any) {
    console.error("Error in generateRandomPrompt:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate random prompt",
    });
  }
};

/**
 * 指定された画像の詳細を取得
 */
export const getImageDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const {imageId} = req.params;

    if (!imageId) {
      res.status(400).json({
        success: false,
        error: "Image ID is required",
      });
      return;
    }

    const generatedImage = await imageGenerationService.getGeneratedImage(imageId);

    if (!generatedImage) {
      res.status(404).json({
        success: false,
        error: "Image not found",
      });
      return;
    }

    res.json({
      success: true,
      data: generatedImage,
    });
  } catch (error: any) {
    console.error("Error in getImageDetails:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get image details",
    });
  }
};

/**
 * 画像生成履歴を取得
 */
export const getImageHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const {limit, userId, purpose} = req.query;

    const limitNum = limit ? parseInt(limit as string) : 50;
    const {images, hasMore} = await imageGenerationService.getImageGenerationHistory(
      limitNum,
      userId as string,
      purpose as string
    );

    res.json({
      success: true,
      data: {
        images,
        hasMore,
        count: images.length,
      },
    });
  } catch (error: any) {
    console.error("Error in getImageHistory:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get image history",
    });
  }
};

/**
 * 画像生成統計を取得
 */
export const getImageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const {period} = req.query;

    const validPeriods = ["day", "week", "month"];
    const selectedPeriod = validPeriods.includes(period as string) ?
      (period as "day" | "week" | "month") :
      "week";

    const stats = await imageGenerationService.getImageGenerationStats(selectedPeriod);

    res.json({
      success: true,
      data: {
        period: selectedPeriod,
        ...stats,
      },
    });
  } catch (error: any) {
    console.error("Error in getImageStats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get image statistics",
    });
  }
};
