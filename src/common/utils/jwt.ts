import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export interface AccessTokenPayload {
  userId: number;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
  }

  return secret;
};

export const issueAccessToken = (userId: number): string => {
  const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '1h') as SignOptions['expiresIn'];

  return jwt.sign({ userId }, getJwtSecret(), { expiresIn });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;

  if (typeof payload.userId !== 'number' || !Number.isInteger(payload.userId)) {
    throw new jwt.JsonWebTokenError('유효하지 않은 토큰 payload입니다.');
  }

  return { userId: payload.userId };
};
