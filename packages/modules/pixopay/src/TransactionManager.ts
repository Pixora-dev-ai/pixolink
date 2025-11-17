import type { Transaction, PaymentResult, PaymentStatus } from './types';

/**
 * In-memory transaction store for managing payment state
 * 
 * In production, this should be replaced with a persistent database
 * (PostgreSQL, MongoDB, etc.) but this provides a simple interface
 * for tracking transactions during the payment lifecycle.
 */
export class TransactionManager {
  private transactions: Map<string, Transaction> = new Map();

  /**
   * Create a new transaction record
   */
  createTransaction(result: PaymentResult): Transaction {
    const transaction: Transaction = {
      id: result.transactionId,
      provider: result.provider,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      customer: result.metadata?.customer as Transaction['customer'],
      description: result.metadata?.description as string,
      paymentUrl: result.paymentUrl,
      providerTransactionId: result.metadata?.providerTransactionId as string,
      metadata: result.metadata,
      createdAt: result.createdAt,
      updatedAt: result.createdAt,
    };

    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  /**
   * Update transaction status
   */
  updateStatus(
    transactionId: string,
    status: PaymentStatus,
    metadata?: Record<string, unknown>
  ): Transaction {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    transaction.status = status;
    transaction.updatedAt = new Date();
    
    if (status === 'completed') {
      transaction.completedAt = new Date();
    } else if (status === 'failed') {
      transaction.failedAt = new Date();
      if (metadata?.errorMessage) {
        transaction.errorMessage = metadata.errorMessage as string;
      }
    }

    if (metadata) {
      transaction.metadata = { ...transaction.metadata, ...metadata };
    }

    return transaction;
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Get transactions by status
   */
  getTransactionsByStatus(status: PaymentStatus): Transaction[] {
    return Array.from(this.transactions.values()).filter(
      (tx) => tx.status === status
    );
  }

  /**
   * Get transactions by provider
   */
  getTransactionsByProvider(provider: Transaction['provider']): Transaction[] {
    return Array.from(this.transactions.values()).filter(
      (tx) => tx.provider === provider
    );
  }

  /**
   * Get pending transactions older than specified minutes
   */
  getStaleTransactions(minutesOld: number = 30): Transaction[] {
    const cutoffTime = new Date(Date.now() - minutesOld * 60 * 1000);
    
    return Array.from(this.transactions.values()).filter(
      (tx) => 
        (tx.status === 'pending' || tx.status === 'processing') &&
        tx.createdAt < cutoffTime
    );
  }

  /**
   * Delete transaction
   */
  deleteTransaction(transactionId: string): boolean {
    return this.transactions.delete(transactionId);
  }

  /**
   * Clear all transactions
   */
  clear(): void {
    this.transactions.clear();
  }

  /**
   * Get transaction count
   */
  count(): number {
    return this.transactions.size;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byStatus: Record<PaymentStatus, number>;
    byProvider: Record<string, number>;
    totalAmount: Record<string, number>; // By currency
  } {
    const stats = {
      total: this.transactions.size,
      byStatus: {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        refunded: 0,
        cancelled: 0,
      } as Record<PaymentStatus, number>,
      byProvider: {} as Record<string, number>,
      totalAmount: {} as Record<string, number>,
    };

    for (const tx of this.transactions.values()) {
      // Count by status
      stats.byStatus[tx.status]++;

      // Count by provider
      stats.byProvider[tx.provider] = (stats.byProvider[tx.provider] || 0) + 1;

      // Sum amounts by currency
      if (tx.status === 'completed') {
        stats.totalAmount[tx.currency] = (stats.totalAmount[tx.currency] || 0) + tx.amount;
      }
    }

    return stats;
  }

  /**
   * Export transactions as JSON
   */
  export(): string {
    const transactions = Array.from(this.transactions.values());
    return JSON.stringify(transactions, null, 2);
  }

  /**
   * Import transactions from JSON
   */
  import(json: string): number {
    try {
      const transactions = JSON.parse(json) as Transaction[];
      let imported = 0;

      for (const tx of transactions) {
        // Convert date strings to Date objects
        tx.createdAt = new Date(tx.createdAt);
        tx.updatedAt = new Date(tx.updatedAt);
        if (tx.completedAt) tx.completedAt = new Date(tx.completedAt);
        if (tx.failedAt) tx.failedAt = new Date(tx.failedAt);

        this.transactions.set(tx.id, tx);
        imported++;
      }

      return imported;
    } catch (error) {
      throw new Error(`Failed to import transactions: ${(error as Error).message}`);
    }
  }
}
