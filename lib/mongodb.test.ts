import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// `vi.mock` factories are hoisted above other top-level code, so any outer
// variable they reference must be created via `vi.hoisted` to avoid a
// temporal-dead-zone error at module evaluation time.
const mockConnect = vi.hoisted(() => vi.fn());

vi.mock('mongoose', () => ({
  default: {
    connect: (...args: unknown[]) => mockConnect(...args),
  },
}));

const ORIGINAL_MONGODB_URI = process.env.MONGODB_URI;

describe('connectDB', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConnect.mockReset();
    delete (globalThis as unknown as { mongoose?: unknown }).mongoose;
  });

  afterEach(() => {
    if (ORIGINAL_MONGODB_URI === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = ORIGINAL_MONGODB_URI;
    }
  });

  it('throws if MONGODB_URI is not defined', async () => {
    delete process.env.MONGODB_URI;
    const { default: connectDB } = await import('./mongodb');

    await expect(connectDB()).rejects.toThrow(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('connects and returns the mongoose instance on success', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    const fakeMongooseInstance = { connection: { readyState: 1 } };
    mockConnect.mockResolvedValue(fakeMongooseInstance);

    const { default: connectDB } = await import('./mongodb');
    const result = await connectDB();

    expect(result).toBe(fakeMongooseInstance);
    expect(mockConnect).toHaveBeenCalledWith('mongodb://localhost:27017/test', {
      bufferCommands: false,
    });
  });

  it('caches the connection and does not reconnect on subsequent calls', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    mockConnect.mockResolvedValue({ id: 'cached-conn' });

    const { default: connectDB } = await import('./mongodb');
    const first = await connectDB();
    const second = await connectDB();

    expect(first).toBe(second);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('shares a single in-flight connection promise for concurrent calls', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    let resolveConnect!: (value: unknown) => void;
    mockConnect.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConnect = resolve;
        })
    );

    const { default: connectDB } = await import('./mongodb');
    const firstCall = connectDB();
    const secondCall = connectDB();

    resolveConnect({ id: 'shared-conn' });
    const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);

    expect(firstResult).toBe(secondResult);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('resets the cached promise on failure and allows a retry to succeed', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    mockConnect.mockRejectedValueOnce(new Error('connection failed'));

    const { default: connectDB } = await import('./mongodb');
    await expect(connectDB()).rejects.toThrow('connection failed');

    mockConnect.mockResolvedValueOnce({ id: 'retry-success' });
    const result = await connectDB();

    expect(result).toEqual({ id: 'retry-success' });
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });
});