import { describe, it, expect } from 'vitest';
import { Event, Booking } from './index';
import EventDefault from './event.model';
import BookingDefault from './booking.model';

describe('database/index barrel exports', () => {
  it('re-exports the Event model as the default export of event.model', () => {
    expect(Event).toBe(EventDefault);
  });

  it('re-exports the Booking model as the default export of booking.model', () => {
    expect(Booking).toBe(BookingDefault);
  });

  it('exposes Event as a mongoose model with the expected model name', () => {
    expect(Event.modelName).toBe('Event');
  });

  it('exposes Booking as a mongoose model with the expected model name', () => {
    expect(Booking.modelName).toBe('Booking');
  });

  it("configures Booking's eventId field to reference the Event model", () => {
    const eventIdPath = Booking.schema.path('eventId') as unknown as { options: { ref: string } };
    expect(eventIdPath.options.ref).toBe('Event');
  });
});