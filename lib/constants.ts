export interface EventItem {
  title: string;
  image: string;
  slug: string;
  location: string;
  date: string;
  time: string;
}

export const events: EventItem[] = [
  {
    title: "React Conf 2026",
    image: "/images/event1.png",
    slug: "react-conf-2026",
    location: "Las Vegas, NV",
    date: "Aug 21, 2026",
    time: "9:00 AM",
  },
  {
    title: "JS Nation 2026",
    image: "/images/event2.png",
    slug: "js-nation-2026",
    location: "Amsterdam, Netherlands",
    date: "Sep 10, 2026",
    time: "10:00 AM",
  },
  {
    title: "PyCon US 2026",
    image: "/images/event3.png",
    slug: "pycon-us-2026",
    location: "Pittsburgh, PA",
    date: "May 12, 2026",
    time: "8:30 AM",
  },
  {
    title: "FlutterCon 2026",
    image: "/images/event4.png",
    slug: "fluttercon-2026",
    location: "Berlin, Germany",
    date: "Jul 8, 2026",
    time: "9:30 AM",
  },
  {
    title: "Devoxx Belgium 2026",
    image: "/images/event5.png",
    slug: "devoxx-belgium-2026",
    location: "Antwerp, Belgium",
    date: "Oct 13, 2026",
    time: "9:00 AM",
  },
  {
    title: "Hacktoberfest Dev Meetup",
    image: "/images/event6.png",
    slug: "hacktoberfest-dev-meetup",
    location: "San Francisco, CA",
    date: "Oct 1, 2026",
    time: "6:00 PM",
  },
];
