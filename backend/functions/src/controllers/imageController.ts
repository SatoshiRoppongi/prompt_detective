// controllers/imageController.ts
import {Request, Response} from "express";
import * as storageService from "../services/storageService";

export const getImage = async (req: Request, res: Response) => {
  const {name} = req.query;
  console.log("name:", name);

  try {
    /*
    const imageUrl = name ?
      await storageService.getImageByName(name as string) :
      await storageService.getLatestImage();
      */
    const imageUrl = await storageService.getImageByName(name as string);

    res.status(200).send({url: imageUrl});
  } catch (error: any) {
    res.status(500).send({error: error.message});
  }
};
