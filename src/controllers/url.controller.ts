import { NextFunction, Request, Response } from "express";
import validUrl from 'valid-url'
import { ShortURL } from "../models/url.model";
import { AppError } from "../utils/errorhandler.utils";
class urlShortnerController {
    public async sharpen(req:Request, res:Response, next:NextFunction){
        try {
            const {longUrl,customAlias, topic}= req.body;
            if (!validUrl.isUri(longUrl)) {
                return next(new AppError('Invalid Url format',400))
            }
            if(customAlias){
                const existingAlias= await ShortURL.findOne({customAlias});
                if(existingAlias){
                    return next(new AppError('Custom alias is already in use.', 400))
                }
            }
        } catch (error) {
            
        }
    }
}
export default  new urlShortnerController();
