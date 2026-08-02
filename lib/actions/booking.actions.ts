'use server';

import Booking from '@/database/booking.model';
import Event from '@/database/event.model';

import connectDB from "@/lib/mongodb";

export const createBooking = async ({ slug, email }: { slug: string; email: string; }) => {
    try {
        await connectDB();

        const event = await Event.findOne({ slug }).select('_id');

        if (!event) {
            return { success: false, message: `Event with slug '${slug}' does not exist` };
        }

        await Booking.create({ eventId: event._id, slug, email });

        return { success: true };
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        console.error('create booking failed', e);
        return { success: false, message };
    }
}