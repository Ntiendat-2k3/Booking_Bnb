/** Dịch lại lời đáp từ tiêu chí đã được máy chủ xác thực, kể cả khi đổi ngôn ngữ giữa hội thoại. */
export function assistantReply({ intent, amount, criteria, count }, t, locale) {
  if (["greeting", "help", "clarify_budget", "needs_details"].includes(intent)) {
    return t(`aiSearch.reply.${intent}`, { amount });
  }

  const where = criteria.city ? t("aiSearch.reply.where", { city: criteria.city }) : "";
  const budget = criteria.max_price
    ? t("aiSearch.reply.budget", {
        price: new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(criteria.max_price),
      })
    : "";
  return t(`aiSearch.reply.${!count ? "empty" : count === 1 ? "one" : "many"}`, {
    count,
    where,
    budget,
    nextStep: t(`aiSearch.reply.${criteria.check_in ? "book" : "dates"}`),
  });
}
