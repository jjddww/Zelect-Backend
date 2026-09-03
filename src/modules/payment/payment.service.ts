import * as PortOne from '@portone/server-sdk';
import AppError from '../../common/exceptions/AppError';
import * as paymentRepository from './payment.repository';
import { cancelPortOnePayment, getPortOnePayment } from './portone.client';

const synchronizePayment = async (paymentId: string, userId?: number) => {
  const localPayment = await paymentRepository.getPaymentOrder(paymentId, userId);
  if (!localPayment) {
    throw new AppError(404, '결제 정보를 찾을 수 없습니다.');
  }

  // 웹훅 이벤트의 도착 순서를 믿지 않고 포트원의 최신 상태를 조회한다.
  const portOnePayment = await getPortOnePayment(paymentId);
  if (PortOne.Payment.isUnrecognizedPayment(portOnePayment)) {
    throw new AppError(502, '지원하지 않는 포트원 결제 응답입니다.');
  }
  if (portOnePayment.id !== paymentId) {
    throw new AppError(409, '포트원 결제 식별자가 일치하지 않습니다.');
  }
  if (portOnePayment.storeId !== process.env.PORTONE_STORE_ID) {
    throw new AppError(409, '결제 상점 정보가 일치하지 않습니다.');
  }
  if (
    portOnePayment.amount.total !== localPayment.amount ||
    portOnePayment.currency !== localPayment.currency
  ) {
    throw new AppError(409, '주문 금액 또는 통화가 결제 정보와 일치하지 않습니다.');
  }

  if ('cancellations' in portOnePayment && portOnePayment.cancellations) {
    for (const cancellation of portOnePayment.cancellations) {
      if (PortOne.Payment.isUnrecognizedPaymentCancellation(cancellation)) continue;
      const localCancellation = await paymentRepository.findLocalCancellation(
        paymentId,
        cancellation.id,
        cancellation.totalAmount,
      );
      if (!localCancellation) continue;
      await paymentRepository.recordCancellationResult(
        localCancellation.id,
        cancellation.id,
        cancellation.status,
      );
    }
  }

  switch (portOnePayment.status) {
    case 'PAID': {
      const result = await paymentRepository.applyPaid(
        paymentId,
        portOnePayment.transactionId,
        new Date(portOnePayment.paidAt),
      );
      if (result === 'NOT_FOUND') {
        throw new AppError(404, '결제 정보를 찾을 수 없습니다.');
      }
      if (result === 'OUT_OF_STOCK') {
        throw new AppError(409, '결제 처리 중 상품 재고가 부족해졌습니다.');
      }
      if (result === 'CANCELED') {
        throw new AppError(409, '이미 취소 처리된 결제입니다.');
      }
      return {
        paymentId,
        orderId: localPayment.order_id,
        status: 'PAID' as const,
        alreadyProcessed: result === 'ALREADY_PAID',
      };
    }
    case 'FAILED': {
      const syncResult = await paymentRepository.applyFailed(
        paymentId,
        portOnePayment.transactionId,
      );
      if (syncResult === 'NOT_FOUND') {
        throw new AppError(404, '결제 정보를 찾을 수 없습니다.');
      }
      if (syncResult === 'UNCHANGED') {
        const persistedPayment = await paymentRepository.getPaymentOrder(paymentId, userId);
        if (persistedPayment?.payment_status === 'PAID') {
          return {
            paymentId,
            orderId: persistedPayment.order_id,
            status: 'PAID' as const,
            alreadyProcessed: true,
          };
        }
      }
      return {
        paymentId,
        orderId: localPayment.order_id,
        status: 'FAILED' as const,
        alreadyProcessed: localPayment.payment_status === 'FAILED',
      };
    }
    case 'PARTIAL_CANCELLED':
      await paymentRepository.applyPartialCancellation(
        paymentId,
        portOnePayment.transactionId,
        portOnePayment.amount.cancelled,
      );
      return {
        paymentId,
        orderId: localPayment.order_id,
        status: 'PARTIALLY_CANCELED' as const,
        alreadyProcessed:
          localPayment.payment_status === 'PARTIALLY_CANCELED' &&
          localPayment.canceled_amount === portOnePayment.amount.cancelled,
      };
    case 'CANCELLED':
      await paymentRepository.applyCancellation(
        paymentId,
        portOnePayment.transactionId,
        portOnePayment.amount.cancelled,
      );
      return {
        paymentId,
        orderId: localPayment.order_id,
        status: 'CANCELED' as const,
        alreadyProcessed: localPayment.payment_status === 'CANCELED',
      };
    case 'READY':
    case 'PAY_PENDING':
    case 'VIRTUAL_ACCOUNT_ISSUED':
      return {
        paymentId,
        orderId: localPayment.order_id,
        status: 'PENDING_PAYMENT' as const,
        alreadyProcessed: true,
      };
  }
};

export const completePayment = async (userId: number, paymentId: string) => {
  const result = await synchronizePayment(paymentId, userId);
  if (result.status !== 'PAID') {
    throw new AppError(409, `결제가 완료되지 않았습니다. 현재 상태: ${result.status}`);
  }
  return result;
};

export interface CancelPaymentItemsInput {
  requestId: string;
  reason: string;
  items: Array<{ orderItemId: number; quantity: number }>;
}

export const cancelPaymentItems = async (
  userId: number,
  paymentId: string,
  input: CancelPaymentItemsInput,
) => {
  const prepared = await paymentRepository.prepareItemCancellation(userId, paymentId, input);
  if (prepared.status === 'NOT_FOUND') {
    throw new AppError(404, '결제 또는 주문 상품을 찾을 수 없습니다.');
  }
  if (prepared.status === 'NOT_CANCELLABLE') {
    throw new AppError(409, '현재 상태에서는 주문 상품을 취소할 수 없습니다.');
  }
  if (prepared.status === 'INVALID_QUANTITY') {
    throw new AppError(409, '취소 가능한 상품 수량을 초과했습니다.');
  }
  if (prepared.status === 'EXISTING') {
    return {
      requestId: prepared.cancellation.request_id,
      status: prepared.cancellation.status,
      amount: prepared.cancellation.amount,
      alreadyProcessed: true,
    };
  }
  if (prepared.status !== 'READY') {
    throw new AppError(500, '결제 취소 요청 준비에 실패했습니다.');
  }

  const response = await cancelPortOnePayment(
    paymentId,
    prepared.amount,
    prepared.currentCancellableAmount,
    prepared.reason,
  );
  const cancellation = response.cancellation;
  if (PortOne.Payment.isUnrecognizedPaymentCancellation(cancellation)) {
    throw new AppError(502, '지원하지 않는 포트원 취소 응답입니다.');
  }
  await paymentRepository.recordCancellationResult(
    prepared.cancellationId,
    cancellation.id,
    cancellation.status,
  );
  return {
    requestId: input.requestId,
    cancellationId: cancellation.id,
    status: cancellation.status,
    amount: cancellation.totalAmount,
    alreadyProcessed: false,
  };
};

export const processWebhook = async (rawBody: string, headers: Record<string, unknown>) => {
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new AppError(500, 'PORTONE_WEBHOOK_SECRET 환경변수가 설정되지 않았습니다.');
  }

  let webhook: Awaited<ReturnType<typeof PortOne.Webhook.verify>>;

  try {
    webhook = await PortOne.Webhook.verify(
      webhookSecret,
      rawBody,
      headers as Record<string, string | string[] | undefined>,
    );
  } catch (error) {
    if (error instanceof PortOne.Webhook.WebhookVerificationError) {
      throw new AppError(400, '유효하지 않은 포트원 웹훅입니다.');
    }

    throw error;
  }

  if (PortOne.Webhook.isUnrecognizedWebhook(webhook) || !('paymentId' in webhook.data)) return;
  const localPayment = await paymentRepository.getPaymentOrder(webhook.data.paymentId);
  if (!localPayment) return;
  await synchronizePayment(webhook.data.paymentId);
};
