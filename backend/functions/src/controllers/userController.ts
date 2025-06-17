/* eslint-disable max-len */
import {Request, Response} from "express";
import * as userService from "../services/userService";

export const createUser = async (req: Request, res: Response) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUser(req.params.id);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({message: "User not found"});
    }
  } catch (error: any) {
    res.status(500).send(error.message);
  }
};

export const getUserByWalletAddress = async (req: Request, res: Response) => {
  try {
    console.log("req:", req.query);
    const walletAddress = req.query.walletAddress;
    if (typeof walletAddress !== "string") {
      res.status(400).send("Invalid walletAddress");
      return;
    }
    const user = await userService.getUserByWalletAddress(walletAddress);
    if (!user) {
      res.status(404).send("User not found");
    } else {
      res.status(200).json(user);
    }
  } catch (error: any) {
    res.status(500).send(error.message);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).send(error.message);
  }
};

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      res.status(400).json({
        success: false,
        error: "Wallet address is required"
      });
      return;
    }

    const profile = await userService.getUserProfile(walletAddress);
    
    if (!profile) {
      res.status(404).json({
        success: false,
        error: "User profile not found"
      });
      return;
    }

    res.json({
      success: true,
      data: profile
    });

  } catch (error: any) {
    console.error('Error in getUserProfile:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get user profile"
    });
  }
};

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      res.status(400).json({
        success: false,
        error: "Wallet address is required"
      });
      return;
    }

    const user = await userService.getUserByWalletAddress(walletAddress);
    if (!user || !user.id) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    const stats = await userService.calculateUserStats(user.id);

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('Error in getUserStats:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get user stats"
    });
  }
};

export const getUserHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress } = req.params;
    const { limit } = req.query;
    
    if (!walletAddress) {
      res.status(400).json({
        success: false,
        error: "Wallet address is required"
      });
      return;
    }

    const user = await userService.getUserByWalletAddress(walletAddress);
    if (!user || !user.id) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    const limitNum = limit ? parseInt(limit as string) : 50;
    const history = await userService.getUserQuizHistory(user.id, limitNum);

    res.json({
      success: true,
      data: {
        history,
        count: history.length
      }
    });

  } catch (error: any) {
    console.error('Error in getUserHistory:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get user history"
    });
  }
};

export const getUserAchievements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      res.status(400).json({
        success: false,
        error: "Wallet address is required"
      });
      return;
    }

    const user = await userService.getUserByWalletAddress(walletAddress);
    if (!user || !user.id) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    const achievements = await userService.getUserAchievements(user.id);

    res.json({
      success: true,
      data: achievements
    });

  } catch (error: any) {
    console.error('Error in getUserAchievements:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get user achievements"
    });
  }
};

export const updateUserPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress } = req.params;
    const { preferences } = req.body;
    
    if (!walletAddress) {
      res.status(400).json({
        success: false,
        error: "Wallet address is required"
      });
      return;
    }

    const user = await userService.getUserByWalletAddress(walletAddress);
    if (!user || !user.id) {
      res.status(404).json({
        success: false,
        error: "User not found"
      });
      return;
    }

    await userService.updateUser(user.id, { preferences });

    res.json({
      success: true,
      message: "User preferences updated successfully"
    });

  } catch (error: any) {
    console.error('Error in updateUserPreferences:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update user preferences"
    });
  }
};

export const updateLastLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      res.status(400).json({
        success: false,
        error: "Wallet address is required"
      });
      return;
    }

    await userService.updateLastLogin(walletAddress);

    res.json({
      success: true,
      message: "Last login updated successfully"
    });

  } catch (error: any) {
    console.error('Error in updateLastLogin:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update last login"
    });
  }
};
