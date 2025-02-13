import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errorhandler.utils";

export const errorMiddleware = (error :AppError , req:Request, res:Response, next:NextFunction)=>{
const statusCode = error.statusCode || 500;
const message = error.message || "Internal Server Error";
res.status(statusCode).json({
    message
})

}