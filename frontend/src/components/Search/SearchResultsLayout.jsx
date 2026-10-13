"use client";

import { useState } from "react";
import ListingCard from "@/components/ListingCard";
import SearchMapPanel from "./SearchMapPanel";

/** Giữ trạng thái tương tác giữa danh sách phòng và bản đồ trong riêng trang tìm kiếm. */
export default function SearchResultsLayout({ items, checkIn, checkOut, city, mapLat, mapLng, userLat, userLng, emptyState, pagination }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [focusRequest, setFocusRequest] = useState({ id: null, sequence: 0 });
  const [expanded, setExpanded] = useState(false);

  function selectCard(id) {
    setSelectedId(id);
    setFocusRequest((previous) => ({ id, sequence: previous.sequence + 1 }));
    if (window.matchMedia("(max-width: 1279px)").matches) setExpanded(true);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              checkIn={checkIn}
              checkOut={checkOut}
              mapSelectable
              mapHighlighted={hoveredId === listing.id || selectedId === listing.id}
              onMapHover={setHoveredId}
              onMapSelect={selectCard}
            />
          ))}
        </div>
        {emptyState}
        {pagination}
      </div>

      <aside>
        <SearchMapPanel
          items={items}
          city={city}
          mapLat={mapLat}
          mapLng={mapLng}
          userLat={userLat}
          userLng={userLng}
          hoveredId={hoveredId}
          selectedId={selectedId}
          focusRequest={focusRequest}
          expanded={expanded}
          onExpandedChange={setExpanded}
          onMarkerHover={setHoveredId}
          onMarkerSelect={setSelectedId}
        />
      </aside>
    </div>
  );
}
