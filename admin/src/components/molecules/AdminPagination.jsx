"use client";

import ReactPaginate from "react-paginate";
import { useTranslations } from "@/i18n/LocaleProvider";

/** Phân trang dùng chung cho danh sách quản trị; trang hiện tại bắt đầu từ 1. */
export default function AdminPagination({
  pageCount,
  page,
  onPageChange,
  total,
  pageSize = 10,
  itemLabel,
  className = "",
  pageRangeDisplayed = 2,
  marginPagesDisplayed = 1,
}) {
  const t = useTranslations();
  if (!pageCount) return null;

  const safePage = Math.min(Math.max(1, page || 1), pageCount);

  return (
    <div className={`admin-pagination-wrap ${className}`}>
      <span>{t("ui.showingCount", { count: Math.min(Math.max((total ?? 0) - (safePage - 1) * pageSize, 0), pageSize), total: total ?? 0, item: itemLabel || "" })}</span>
      {pageCount > 1 ? <ReactPaginate
        pageCount={pageCount}
        forcePage={safePage - 1}
        onPageChange={({ selected }) => onPageChange?.(selected + 1)}
        marginPagesDisplayed={marginPagesDisplayed}
        pageRangeDisplayed={pageRangeDisplayed}
        previousLabel="‹"
        nextLabel="›"
        breakLabel="…"
        previousAriaLabel={t("common.previousPage")}
        nextAriaLabel={t("common.nextPage")}
        ariaLabelBuilder={(pageNumber, selected) => t(selected ? "common.currentPageNumber" : "common.pageNumber", { page: pageNumber })}
        breakAriaLabels={{ forward: t("common.jumpForward"), backward: t("common.jumpBackward") }}
        containerClassName="admin-pagination flex items-center gap-2 justify-end select-none"
        activeClassName="selected"
        disabledClassName="disabled"
        breakClassName="px-1"
      /> : null}
    </div>
  );
}
