"use client";

import Image from "next/image";
import posthog from "posthog-js";

const ExploreBtn = () => {
  const handleExploreClick = () => {
    console.log("Explore button clicked");
    posthog.capture("explore_events_clicked");
  };

  return (
    <button
      onClick={handleExploreClick}
      type="button"
      id="explore-btn"
      className="mt-7 mx-auto"
    >
      <a href="#events">
        Explore Events
        <Image
          src="/icons/arrow-down.svg"
          alt="arrow-down"
          height={14}
          width={14}
          style={{ width: "auto", height: "auto" }}
        />
      </a>
    </button>
  );
};

export default ExploreBtn;
