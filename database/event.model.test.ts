import { Schema } from 'mongoose';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { IEvent } from './event.model';

type NextFn = (err?: Error) => void;
type PreSaveHook = (this: Partial<IEvent> & { isModified: (f: string) => boolean; isNew: boolean }, next: NextFn) => void;

const validEventData = {
  title: 'Annual Tech Conference',
  description: 'A conference about technology.',
  overview: 'An overview of the conference.',
  image: 'https://example.com/image.png',
  venue: 'Convention Center',
  location: 'New York, NY',
  date: '2024-05-01',
  time: '10:00',
  mode: 'offline',
  audience: 'Developers',
  agenda: ['Opening Keynote', 'Workshops'],
  organizer: 'Tech Org',
  tags: ['tech', 'conference'],
};

describe('Event model', () => {
  let Event: typeof import('./event.model').default;
  let preSaveHook: PreSaveHook;

  beforeAll(async () => {
    // Spy on Schema.prototype.pre BEFORE importing the module so we can
    // capture the actual pre-save hook function registered by event.model.ts.
    const preSpy = vi.spyOn(Schema.prototype, 'pre');

    const mod = await import('./event.model');
    Event = mod.default;

    const saveHookCall = preSpy.mock.calls.find((call) => call[0] === 'save');
    if (!saveHookCall) {
      throw new Error('Expected a pre("save") hook to be registered on EventSchema');
    }
    preSaveHook = saveHookCall[1] as unknown as PreSaveHook;

    preSpy.mockRestore();
  });

  describe('schema validation', () => {
    it('passes validation for a fully valid document', () => {
      const doc = new Event(validEventData);
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });

    it.each([
      'title',
      'description',
      'overview',
      'image',
      'venue',
      'location',
      'date',
      'time',
      'mode',
      'audience',
      'agenda',
      'organizer',
      'tags',
    ])('requires the "%s" field', (field) => {
      const data = { ...validEventData } as Record<string, unknown>;
      delete data[field];
      const doc = new Event(data);
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors[field]).toBeDefined();
    });

    it('rejects a title longer than 100 characters', () => {
      const doc = new Event({ ...validEventData, title: 'a'.repeat(101) });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors.title.message).toMatch(/cannot exceed 100 characters/);
    });

    it('rejects a description longer than 1000 characters', () => {
      const doc = new Event({ ...validEventData, description: 'a'.repeat(1001) });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors.description.message).toMatch(/cannot exceed 1000 characters/);
    });

    it('rejects an overview longer than 500 characters', () => {
      const doc = new Event({ ...validEventData, overview: 'a'.repeat(501) });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors.overview.message).toMatch(/cannot exceed 500 characters/);
    });

    it.each(['online', 'offline', 'hybrid'])('accepts "%s" as a valid mode', (mode) => {
      const doc = new Event({ ...validEventData, mode });
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    });

    it('rejects an invalid mode value', () => {
      const doc = new Event({ ...validEventData, mode: 'in-person' });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors.mode.message).toMatch(/Mode must be either online, offline, or hybrid/);
    });

    it('rejects an empty agenda array', () => {
      const doc = new Event({ ...validEventData, agenda: [] });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors.agenda.message).toMatch(/At least one agenda item is required/);
    });

    it('rejects an empty tags array', () => {
      const doc = new Event({ ...validEventData, tags: [] });
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect(err!.errors.tags.message).toMatch(/At least one tag is required/);
    });

    it('trims and lowercases the slug on assignment', () => {
      const doc = new Event({ ...validEventData, slug: '  My-Custom-Slug  ' });
      expect(doc.slug).toBe('my-custom-slug');
    });

    it('trims whitespace on string fields such as title', () => {
      const doc = new Event({ ...validEventData, title: '  Trimmed Title  ' });
      expect(doc.title).toBe('Trimmed Title');
    });
  });

  describe('indexes', () => {
    it('defines a unique index on slug', () => {
      const indexes = Event.schema.indexes();
      const slugIndex = indexes.find(([fields]) => Object.keys(fields).length === 1 && fields.slug === 1);
      expect(slugIndex).toBeDefined();
      expect(slugIndex![1].unique).toBe(true);
    });

    it('defines a compound index on date and mode', () => {
      const indexes = Event.schema.indexes();
      const compoundIndex = indexes.find(
        ([fields]) => fields.date === 1 && fields.mode === 1
      );
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('pre-save hook: slug generation', () => {
    it('generates a slug from the title for a new document', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Hello, World!  Foo--Bar',
        isNew: true,
        isModified: () => false,
      };
      preSaveHook.call(ctx, next);
      expect(ctx).toHaveProperty('slug', 'hello-world-foo-bar');
      expect(next).toHaveBeenCalledWith();
    });

    it('regenerates the slug when the title is modified on an existing document', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Updated Title!!',
        isNew: false,
        isModified: (field: string) => field === 'title',
      };
      preSaveHook.call(ctx, next);
      expect(ctx).toHaveProperty('slug', 'updated-title');
    });

    it('does not touch the slug when title is unmodified on an existing document', () => {
      const next = vi.fn();
      const ctx: Record<string, unknown> = {
        title: 'Some Title',
        slug: 'existing-slug',
        isNew: false,
        isModified: () => false,
      };
      preSaveHook.call(ctx, next);
      expect(ctx.slug).toBe('existing-slug');
    });

    it('collapses multiple spaces/hyphens and strips special characters', () => {
      const next = vi.fn();
      const ctx = {
        title: '  Foo   Bar & Baz!!! --- Qux  ',
        isNew: true,
        isModified: () => false,
      };
      preSaveHook.call(ctx, next);
      expect(ctx).toHaveProperty('slug', 'foo-bar-baz-qux');
    });
  });

  describe('pre-save hook: date normalization', () => {
    it('normalizes an ISO date string to YYYY-MM-DD', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        date: '2024-03-05T10:00:00.000Z',
        isNew: false,
        isModified: (field: string) => field === 'date',
      };
      preSaveHook.call(ctx, next);
      expect(ctx.date).toBe('2024-03-05');
    });

    it('leaves an already-normalized date unchanged', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        date: '2024-03-05',
        isNew: false,
        isModified: (field: string) => field === 'date',
      };
      preSaveHook.call(ctx, next);
      expect(ctx.date).toBe('2024-03-05');
    });

    it('does not touch the date field when unmodified', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        date: 'unchanged-value',
        isNew: false,
        isModified: () => false,
      };
      preSaveHook.call(ctx, next);
      expect(ctx.date).toBe('unchanged-value');
    });

    it('throws when the date is invalid', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        date: 'not-a-real-date',
        isNew: false,
        isModified: (field: string) => field === 'date',
      };
      expect(() => preSaveHook.call(ctx, next)).toThrow('Invalid date format');
    });
  });

  describe('pre-save hook: time normalization', () => {
    it('leaves an already 24-hour formatted time unchanged', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        time: '14:30',
        isNew: false,
        isModified: (field: string) => field === 'time',
      };
      preSaveHook.call(ctx, next);
      expect(ctx.time).toBe('14:30');
    });

    it('converts a PM time to 24-hour format', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        time: '2:30 PM',
        isNew: false,
        isModified: (field: string) => field === 'time',
      };
      preSaveHook.call(ctx, next);
      expect(ctx.time).toBe('14:30');
    });

    it('converts 12:00 AM to 00:00 (midnight)', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        time: '12:00 AM',
        isNew: false,
        isModified: (field: string) => field === 'time',
      };
      preSaveHook.call(ctx, next);
      expect(ctx.time).toBe('00:00');
    });

    it('keeps 12:00 PM as noon (12:00)', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        time: '12:00 PM',
        isNew: false,
        isModified: (field: string) => field === 'time',
      };
      preSaveHook.call(ctx, next);
      expect(ctx.time).toBe('12:00');
    });

    it('handles lowercase am/pm suffixes without a space', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        time: '9:05am',
        isNew: false,
        isModified: (field: string) => field === 'time',
      };
      preSaveHook.call(ctx, next);
      expect(ctx.time).toBe('09:05');
    });

    it('does not touch the time field when unmodified', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        time: 'unchanged-value',
        isNew: false,
        isModified: () => false,
      };
      preSaveHook.call(ctx, next);
      expect(ctx.time).toBe('unchanged-value');
    });

    it('throws on an unparsable time string', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        time: 'not-a-time',
        isNew: false,
        isModified: (field: string) => field === 'time',
      };
      expect(() => preSaveHook.call(ctx, next)).toThrow('Invalid time format. Use HH:MM or HH:MM AM/PM');
    });

    it('throws when the resulting hour is out of range', () => {
      // "23:00 PM" matches the regex but 23 + 12 = 35 which is out of range.
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        time: '23:00 PM',
        isNew: false,
        isModified: (field: string) => field === 'time',
      };
      expect(() => preSaveHook.call(ctx, next)).toThrow('Invalid time values');
    });

    it('throws when the minutes are out of range', () => {
      const next = vi.fn();
      const ctx = {
        title: 'Title',
        time: '10:75',
        isNew: false,
        isModified: (field: string) => field === 'time',
      };
      expect(() => preSaveHook.call(ctx, next)).toThrow('Invalid time values');
    });
  });
});