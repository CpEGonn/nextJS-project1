import { Suspense } from "react";
import EventDetails from "@/components/EventDetails";

const EventDetailsPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        <EventDetails params={params.then((p) => p.slug)} />
      </Suspense>
    </main>
  );
};

export default EventDetailsPage;