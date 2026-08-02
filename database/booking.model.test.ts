import { Schema, Types } from 'mongoose';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type { IBooking } from './booking.model';

vi.mock('./event.model', () => ({
  default: {
    findById: vi.fn(),
  },
}));

// Imported after the mock declaration so it resolves to the mocked module.
import EventModel from './event.model';

type NextFn = (err?: Error) => void;
type PreSaveHook = (
  this: Partial<IBooking> & { isModified: (f: string) => boolean; isNew: boolean },
  next: NextFn
) => Promise<void>;

const mockedFindById = EventModel.findById as unknown as ReturnType<typeof vi.fn>;

function mockFindByIdResolves(value: unknown) {
  mockedFindById.mockReturnValue({ select: vi.fn().mockResolvedValue(value) });
}

function mockFindByIdRejects(error: unknown) {
  mockedFindById.mockReturnValue({ select: vi.fn().mockRejectedValue(error) });
}

describe('Booking model', () => {
  let Booking: typeof import('./booking.model').default;
  let preSaveHook: PreSaveHook;

  beforeAll(async () => {
    const preSpy = vi.spyOn(Schema.prototype, 'pre');

    const mod = await import('./booking.model');
    Booking = mod.default;

    const saveHookCall = preSpy.mock.calls.find((call) => call[0] === 'save');
    if (!saveHookCall) {
      throw new Error('Expected a pre("save") hook to be registered on BookingSchema');
    }
    preSaveHook = saveHookCall[1] as unknown as PreSaveHook;

    preSpy.mockRestore();
  });

  beforeEach(() => {
    mockedFindById.mockReset();
  });

  describe('schema validation', () => {
    it('passes validation for a fully valid document', () => {
      const doc = new Booking({
        eventId: new Types.ObjectId(),
        email: 'user@example.com',
      });
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });

    it('requires eventId', () => {
      const doc = new Booking({ email: 'user@example.com' });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors.eventId).toBeDefined();
    });

    it('requires email', () => {
      const doc = new Booking({ eventId: new Types.ObjectId() });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors.email).toBeDefined();
    });

    it('rejects an invalid eventId format', () => {
      const doc = new Booking({ eventId: 'not-a-valid-object-id', email: 'user@example.com' });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors.eventId).toBeDefined();
    });

    it.each([
      'plainaddress',
      '@missing-local.com',
      'missing-domain@',
      'spaces in@address.com',
      'no-at-symbol.com',
    ])('rejects an invalid email address "%s"', (email) => {
      const doc = new Booking({ eventId: new Types.ObjectId(), email });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors.email.message).toMatch(/Please provide a valid email address/);
    });

    it.each([
      'user@example.com',
      'first.last@example.co.uk',
      'user+tag@example.com',
      'user_name@sub.example.com',
    ])('accepts a valid email address "%s"', (email) => {
      const doc = new Booking({ eventId: new Types.ObjectId(), email });
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });

    it('trims and lowercases the email on assignment', () => {
      const doc = new Booking({ eventId: new Types.ObjectId(), email: '  TEST@Example.COM  ' });
      expect(doc.email).toBe('test@example.com');
    });
  });

  describe('indexes', () => {
    it('defines an index on eventId', () => {
      const indexes = Booking.schema.indexes();
      const eventIdIndex = indexes.find(
        ([fields]) => Object.keys(fields).length === 1 && fields.eventId === 1
      );
      expect(eventIdIndex).toBeDefined();
    });

    it('defines a compound index on eventId and createdAt', () => {
      const indexes = Booking.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields]) => fields.eventId === 1 && fields.createdAt === -1
      );
      expect(compoundIndex).toBeDefined();
    });

    it('defines an index on email', () => {
      const indexes = Booking.schema.indexes();
      const emailIndex = indexes.find(
        ([fields]) => Object.keys(fields).length === 1 && fields.email === 1
      );
      expect(emailIndex).toBeDefined();
    });

    it('defines a unique compound index on eventId and email named "uniq_event_email"', () => {
      const indexes = Booking.schema.indexes();
      const uniqueIndex = indexes.find(
        ([fields, options]) =>
          fields.eventId === 1 && fields.email === 1 && options.name === 'uniq_event_email'
      );
      expect(uniqueIndex).toBeDefined();
      expect(uniqueIndex![1].unique).toBe(true);
    });
  });

  describe('pre-save hook: event existence validation', () => {
    it('calls next() with no error when the referenced event exists and document is new', async () => {
      mockFindByIdResolves({ _id: 'some-event-id' });
      const next = vi.fn();
      const ctx = {
        eventId: new Types.ObjectId(),
        isNew: true,
        isModified: () => false,
      };

      await preSaveHook.call(ctx, next);

      expect(mockedFindById).toHaveBeenCalledWith(ctx.eventId);
      expect(next).toHaveBeenCalledWith();
    });

    it('calls next() with a ValidationError when the referenced event does not exist', async () => {
      mockFindByIdResolves(null);
      const next = vi.fn();
      const ctx = {
        eventId: new Types.ObjectId(),
        isNew: true,
        isModified: () => false,
      };

      await preSaveHook.call(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = next.mock.calls[0][0] as Error;
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toMatch(/does not exist/);
      expect(errorArg.name).toBe('ValidationError');
    });

    it('calls next() with a ValidationError when the existence lookup throws', async () => {
      mockFindByIdRejects(new Error('connection lost'));
      const next = vi.fn();
      const ctx = {
        eventId: new Types.ObjectId(),
        isNew: true,
        isModified: () => false,
      };

      await preSaveHook.call(ctx, next);

      expect(next).toHaveBeenCalledTimes(1);
      const errorArg = next.mock.calls[0][0] as Error;
      expect(errorArg.message).toBe('Invalid events ID format or database error');
      expect(errorArg.name).toBe('ValidationError');
    });

    it('validates when eventId is modified on an existing (non-new) document', async () => {
      mockFindByIdResolves({ _id: 'some-event-id' });
      const next = vi.fn();
      const ctx = {
        eventId: new Types.ObjectId(),
        isNew: false,
        isModified: (field: string) => field === 'eventId',
      };

      await preSaveHook.call(ctx, next);

      expect(mockedFindById).toHaveBeenCalledWith(ctx.eventId);
      expect(next).toHaveBeenCalledWith();
    });

    it('skips the existence check when eventId is unmodified and the document is not new', async () => {
      const next = vi.fn();
      const ctx = {
        eventId: new Types.ObjectId(),
        isNew: false,
        isModified: () => false,
      };

      await preSaveHook.call(ctx, next);

      expect(mockedFindById).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });
  });
});