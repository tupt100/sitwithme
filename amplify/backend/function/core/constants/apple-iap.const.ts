export const AppleIAPFailedReason = {
  21002: 'The data in the receipt-data property was malformed or the service experienced a temporary issue. Try again.',
  21003: 'The receipt could not be authenticated.',
  21004: 'The shared secret you provided does not match the shared secret on file for your account.',
  21005: 'The receipt server was temporarily unable to provide the receipt. Try again.',
  21006: 'This receipt is valid but the subscription has expired.',
  21009: 'Internal data access error. Try again later.',
  21010: 'The user account cannot be found or has been deleted.',
}

export const ExpirationReason = {
  1: 'The customer voluntarily canceled their subscription.',
  2: `Billing error; for example, the customer's payment information was no longer valid.`,
  3: 'The customer did not agree to a recent price increase.',
  4: 'The product was not available for purchase at the time of renewal.',
  5: 'Unknown error.',
}

export const CancellationReason = {
  1: 'The customer canceled their transaction due to an actual or perceived issue within your app.',
  0: 'The transaction was canceled for another reason.',
}