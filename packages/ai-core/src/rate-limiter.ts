export class TokenBucketLimiter {
  private tokens: number;
  private lastRefill: number;
  private concurrent = 0;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number,
    private readonly maxConcurrent: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    // Polling đơn giản, tránh race deadlock khi nhiều waiter đan xen release().
    // Với maxConcurrent thấp (1-2) và acquire gọi tuần tự trong pipeline, polling
    // 100ms là đủ và an toàn.
    while (true) {
      this.refill();
      if (this.tokens >= 1 && this.concurrent < this.maxConcurrent) {
        this.tokens -= 1;
        this.concurrent += 1;
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  release(): void {
    this.concurrent = Math.max(0, this.concurrent - 1);
  }
}
