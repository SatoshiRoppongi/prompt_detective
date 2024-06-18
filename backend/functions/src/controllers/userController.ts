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
