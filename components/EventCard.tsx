"use client";

import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";

interface Props {
  title: string;
  image: string;
  slug: string;
  location: string;
  date: string;
  time: string;
}

const EventCard = ({ title, image, slug, location, date, time }: Props) => {
  return (
    <Link
      href={`/events/${slug}`}
      id="event-card"
      onClick={() => posthog.capture("event_card_selected", { event_slug: slug })}
    >
      <Image
        src={image}
        alt={title}
        width={410}
        height={300}
        className="poster"
        style={{ width: "auto", height: "auto" }}
        loading="eager"
        fetchPriority="high"
      />
      <div className="flex flex-row gap-2"></div>
      <p className="title">{title}</p>

      <div className="flex flex-row gap-2">
          <Image src="/icons/pin.svg" alt="location" height={14} width={14} style={{ width: "auto", height: "auto" }} />
          <p>{location}</p>
        </div>

      <div className="datetime">
        <div>
          <Image src="/icons/calendar.svg" alt="date" height={14} width={14} style={{ width: "auto", height: "auto" }} />
          <p>{date}</p>
        </div>

        <div>
          <Image src="/icons/clock.svg" alt="time" height={14} width={14} style={{ width: "auto", height: "auto" }} />
          <p>{time}</p>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;

