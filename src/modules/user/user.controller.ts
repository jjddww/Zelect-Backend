import { NextFunction, Request, Response } from 'express';
import * as userService from './user.service';

const LOGIN_ID_PATTERN = /^[A-Za-z0-9_]{4,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (value: unknown, maxLength: number): value is string => {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
};

export const signUp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loginId, email, password, name, phone, address } = req.body;

    if (typeof loginId !== 'string' || !LOGIN_ID_PATTERN.test(loginId.trim())) {
      return res.status(400).json({
        success: false,
        message: '아이디는 영문, 숫자, 밑줄로 구성된 4~30자여야 합니다.',
      });
    }

    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      return res.status(400).json({ success: false, message: '유효한 이메일을 입력해 주세요.' });
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: '비밀번호는 8자 이상 72자 이하로 입력해 주세요.',
      });
    }

    if (!isNonEmptyString(name, 50)) {
      return res.status(400).json({ success: false, message: '이름을 입력해 주세요.' });
    }
    if (!isNonEmptyString(phone, 20)) {
      return res.status(400).json({ success: false, message: '전화번호를 입력해 주세요.' });
    }
    if (!isNonEmptyString(address, 500)) {
      return res.status(400).json({ success: false, message: '주소를 입력해 주세요.' });
    }

    const user = await userService.signUp({ loginId, email, password, name, phone, address });

    return res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loginId, password } = req.body;

    if (typeof loginId !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: '아이디와 비밀번호를 입력해 주세요.',
      });
    }

    const result = await userService.login(loginId, password);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
