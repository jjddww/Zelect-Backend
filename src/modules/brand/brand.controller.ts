import { Request, Response, NextFunction } from 'express';
import * as brandService from './brand.service';

export const getBrandOfWeek = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await brandService.getBrandOfWeek();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// export const getBrandList = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const result = await brandService.getBrandList();

//     res.status(200).json({
//       success: true,
//       data: result,
//     });
//   } catch (error) {
//     next(error);
//   }
// };
