"use strict";

/** Quy tắc được phiên bản hóa để booking cũ không đổi quyền lợi khi Host sửa phòng. */
const POLICIES = Object.freeze({
  flexible: { code: "flexible", version: 1, windows: [{ days_before: 1, refund_percent: 100 }], grace_hours: 48 },
  moderate: { code: "moderate", version: 1, windows: [
    { days_before: 5, refund_percent: 100 }, { days_before: 1, refund_percent: 50 },
  ], grace_hours: 48 },
  strict: { code: "strict", version: 1, windows: [{ days_before: 7, refund_percent: 50 }], grace_hours: 48 },
});

function snapshot(code = "moderate") {
  const policy = POLICIES[code];
  if (!policy) throw Object.assign(new Error("Invalid cancellation policy"), { status: 400 });
  return JSON.parse(JSON.stringify(policy));
}

/** Ranh giới tính theo ngày UTC của booking; miễn phí 48 giờ đầu nếu còn hơn 48 giờ trước check-in. */
function quote({ policy, checkIn, bookedAt, paidAmount, now = new Date() }) {
  const rule = policy?.windows ? policy : snapshot(policy?.code || "moderate");
  const paid = BigInt(paidAmount);
  if (paid < 0n || paid > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Invalid paid amount");
  const checkInDay = Date.parse(`${checkIn}T00:00:00Z`);
  const todayDay = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const daysBefore = Math.round((checkInDay - todayDay) / 86400000);
  const withinGrace = new Date(bookedAt).getTime() + rule.grace_hours * 3600000 > now.getTime() &&
    checkInDay - now.getTime() > rule.grace_hours * 3600000;
  const percent = withinGrace ? 100 :
    (rule.windows.find((window) => daysBefore >= window.days_before)?.refund_percent || 0);
  const refund = paid * BigInt(percent) / 100n;
  return {
    policy: rule, paid_amount: paid.toString(), refund_amount: refund.toString(),
    non_refundable_amount: (paid - refund).toString(), refund_percent: percent,
    days_before_check_in: daysBefore, within_grace_period: withinGrace,
  };
}

module.exports = { POLICIES, snapshot, quote };
