"use client";

import ReactPaginate from "react-paginate";

/**
 * Reusable pagination for Admin list pages.
 * Controlled component:
 * - page: 1-based current page
 * - pageCount: total pages
 * - onPageChange: (nextPage: number) => void
 */
export default function AdminPagination({
  pageCount,
  page,
  onPageChange,
  className = "",
  pageRangeDisplayed = 2,
  marginPagesDisplayed = 1,
}) {
  if (!pageCount || pageCount <= 1) return null;

  const safePage = Math.min(Math.max(1, page || 1), pageCount);

  return (
    <div className={className}>
      <ReactPaginate
        pageCount={pageCount}
        forcePage={safePage - 1}
        onPageChange={({ selected }) => onPageChange?.(selected + 1)}
        marginPagesDisplayed={marginPagesDisplayed}
        pageRangeDisplayed={pageRangeDisplayed}
        previousLabel="‹"
        nextLabel="›"
        breakLabel="…"
        containerClassName="flex items-center gap-2 justify-end mt-4 select-none"
        pageClassName="px-3 py-1 rounded border hover:bg-gray-100"
        activeClassName="bg-black text-white border-black hover:bg-black"
        previousClassName="px-3 py-1 rounded border hover:bg-gray-100"
        nextClassName="px-3 py-1 rounded border hover:bg-gray-100"
        disabledClassName="opacity-40 cursor-not-allowed hover:bg-transparent"
        breakClassName="px-2 py-1"
      />
    </div>
  );
}
