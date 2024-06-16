// controllers/imageController.ts
import {Request, Response} from "express";
import * as storageService from "../services/storageService";

export const getImage = async (req: Request, res: Response) => {
  const {date} = req.query;

  try {
    const imageUrl = date ?
      await storageService.getImageByDate(date as string) :
      await storageService.getLatestImage();

    res.status(200).send({url: imageUrl});
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};
