// 포트원 API 호출

import { PaymentClient } from '@portone/server-sdk';
import AppError from '../../common/exceptions/AppError';

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new AppError(500, `${name} 환경변수가 설정되지 않았습니다.`);
  }

  return value;
};

const getPaymentClient = () =>
  PaymentClient({
    secret: getRequiredEnv('PORTONE_API_SECRET'),
  });

export const getPortOnePayment = async (paymentId: string) => {
  try {
    return await getPaymentClient().getPayment({ paymentId });
  } catch (error) {
    console.error('PortOne payment lookup failed', error);
    throw new AppError(502, '포트원 결제 정보를 확인할 수 없습니다.');
  }
};

export const cancelPortOnePayment = async (
  paymentId: string,
  amount: number,
  currentCancellableAmount: number,
  reason: string,
) => {
  const client = PaymentClient({ secret: getRequiredEnv('PORTONE_API_SECRET') });
  try {
    return await client.cancelPayment({
      paymentId,
      amount,
      currentCancellableAmount,
      reason,
      requester: 'CUSTOMER',
    });
  } catch (error) {
    console.error('PortOne payment cancellation failed', error);
    throw new AppError(502, '포트원 결제 취소를 요청할 수 없습니다.');
  }
};

export const getPortOneClientConfig = () => ({
  storeId: getRequiredEnv('PORTONE_STORE_ID'),
  channelKey: getRequiredEnv('PORTONE_CHANNEL_KEY'),
});
