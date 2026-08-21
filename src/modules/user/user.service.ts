import AppError from '../../common/exceptions/AppError';
import { hashPassword, verifyPassword } from '../../common/utils/bcrypt';
import { issueAccessToken } from '../../common/utils/jwt';
import * as userRepository from './user.repository';

export interface SignUpInput {
  loginId: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
}

export const signUp = async (input: SignUpInput) => {
  const loginId = input.loginId.trim();
  const email = input.email.trim().toLowerCase();

  const [loginIdUser, emailUser] = await Promise.all([
    userRepository.findByLoginId(loginId),
    userRepository.findByEmail(email),
  ]);

  if (loginIdUser) throw new AppError(409, '이미 사용 중인 아이디입니다.');
  if (emailUser) throw new AppError(409, '이미 사용 중인 이메일입니다.');

  const passwordHash = await hashPassword(input.password);
  const userId = await userRepository.createUser({
    loginId,
    email,
    passwordHash,
    name: input.name.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
  });

  return {
    id: userId,
    loginId,
    email,
    name: input.name.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    grade: 'GENERAL' as const,
    mileage: 0,
    status: 'ACTIVE' as const,
  };
};

export const login = async (loginId: string, password: string) => {
  const user = await userRepository.findByLoginId(loginId.trim());

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new AppError(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(403, '이용할 수 없는 회원 계정입니다.');
  }

  return {
    accessToken: issueAccessToken(user.id),
    user: {
      id: user.id,
      loginId: user.login_id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      grade: user.grade,
      mileage: user.mileage,
      status: user.status,
    },
  };
};
