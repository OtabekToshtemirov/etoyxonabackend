export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  PAYME = 'payme',
  CLICK = 'click',
  UZUM = 'uzum',
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentType {
  DEPOSIT = 'deposit',
  PAYMENT = 'payment',
  FINAL = 'final',
  REFUND = 'refund',
}
