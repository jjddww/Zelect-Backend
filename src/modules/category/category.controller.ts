import { Request, Response, NextFunction } from 'express';
import * as categoryService from './category.service';

export const getCategories = async (req:Request, res: Response, next: NextFunction) => {
    try {
        const result = await categoryService.getCategories();

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};