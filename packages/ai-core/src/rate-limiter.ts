export class TokenBucketLimiter {
  private tokens: number;
  private lastRefill: number;
  private concurrent = 0;
  private waitQueue: Array<() => void> = [];

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

  private tryAcquireToken(): boolean {
    this.refill();
    if (this.tokens >= 1 && this.concurrent < this.maxConcurrent) {
      this.tokens -= 1;
      this.concurrent += 1;
      return true;
    }
    return false;
  }

  async acquire(): Promise<void> {
    if (this.tryAcquireToken()) return;

    await new Promise<void>((resolve) => {
      const check = (): void => {
        if (this.tryAcquireToken()) {
          resolve();
          return;
        }
        setTimeout(check, 50);
      };
      this.waitQueue.push(check);
      check();
    });
  }

  release(): void {
    this.concurrent = Math.max(0, this.concurrent - 1);
    const next = this.waitQueue.shift();
    if (next) next();
  }
}
