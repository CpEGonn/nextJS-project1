import EventCard from "@/components/EventCard";
import ExploreBtn from "@/components/ExploreBtn";
import { IEvent } from "@/database";

import { API_BASE } from "@/lib/base-url";

const Page = async () => {
  const response = await fetch(`${API_BASE}/api/events`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Failed to load events");
  }

  const { events } = (await response.json()) as { events: IEvent[] };

  return (
    <section>
      <h1 className="text-center">
        The Hub for Every Dev <br /> Event You Can&apos;t Miss
      </h1>
      <p className="text-center mt-5">
        Hackathons, Meetups, and Conferences, All in One Place
      </p>
      <ExploreBtn />
      <div className="mt-20 space-y-7">
        <h3>Featured Events</h3>

        <ul className="events">
          {events && events.length > 0 ? (
            events.map((event: IEvent) => (
              <li key={event.slug}>
                <EventCard {...event} />
              </li>
            ))
          ) : (
            <li className="text-light-200">No events yet.</li>
          )}
        </ul>
      </div>
    </section>
  );
};

export default Page;