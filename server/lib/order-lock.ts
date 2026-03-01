const processingOrders = new Set<string>();

export function acquireOrderLock(escrowAddress: string): boolean {
  if (processingOrders.has(escrowAddress)) return false;
  processingOrders.add(escrowAddress);
  return true;
}

export function releaseOrderLock(escrowAddress: string): void {
  processingOrders.delete(escrowAddress);
}
