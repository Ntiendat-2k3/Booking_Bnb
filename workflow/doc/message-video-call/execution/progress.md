# PROGRESS — message-video-call

<!--
AI: khối AUTO do `sync` ghi đè — MUST NOT sửa tay (R27). Các bảng bên dưới ghi tay.
Ô bảng KHÔNG chứa ký tự `|`. Giữ nguyên marker table.
-->

- **Plan:** `../plan.md` · **SRS:** `../srs/` · **Index:** `_index-tasks.md`, `_index-testcase.md`

Plan đã qua PQG và được phân rã thành 4 Task, 14 Phase, 59 TC. Người dùng xác nhận không có Swagger/OpenAPI và chỉ đạo dùng backend; contract chat được ghi ở `../backend-contract.md`. Gate 1 technical check qua với 0 lỗi; API-05, API-06, API-08 cho call vẫn OPEN và Phase phụ thuộc tiếp tục bị chặn.

## Status (AUTO)

<!-- AUTO:BEGIN -->
### Task
| TASK | Depends | Phase DONE/Total | TC PASS/Total | Status |
| --- | --- | --- | --- | --- |
| TASK-01 | none | 0/3 | 0/15 | TODO |
| TASK-02 | TASK-01 | 0/4 | 0/16 | TODO |
| TASK-03 | TASK-02 | 0/3 | 0/12 | TODO |
| TASK-04 | TASK-03 | 0/4 | 0/16 | TODO |

### Phase
| PHASE | Gate3 | TC PASS/Total | Status |
| --- | --- | --- | --- |
| PH-01.1 | strict | 0/5 | TODO |
| PH-01.2 | strict | 0/5 | TODO |
| PH-01.3 | strict | 0/5 | TODO |
| PH-02.1 | strict | 0/3 | TODO |
| PH-02.2 | strict | 0/4 | TODO |
| PH-02.3 | strict | 0/5 | TODO |
| PH-02.4 | strict | 0/4 | TODO |
| PH-03.1 | strict | 0/4 | TODO |
| PH-03.2 | strict | 0/4 | TODO |
| PH-03.3 | strict | 0/4 | TODO |
| PH-04.1 | strict | 0/5 | TODO |
| PH-04.2 | strict | 0/4 | TODO |
| PH-04.3 | strict | 0/4 | TODO |
| PH-04.4 | strict | 0/3 | TODO |

### Tổng
- REQ DONE: 0/12
- TC PASS: 0/59
- Risk HIGH/MED chưa DONE: RISK-01, RISK-02, RISK-03, RISK-04, RISK-05, RISK-06
- FAIL/BLOCKED: none
<!-- AUTO:END -->

## History (R53)

<!-- table:history -->
| Time | Phase | Change | Checks | Commit | Result |
|---|---|---|---|---|---|

## Deviations (R32) — sai khác không đổi scope/architecture/BR

<!-- table:dev -->
| DEV | Phase | Deviation | Cause | Impact | NeedCR |
|---|---|---|---|---|---|

## Change Requests (R31) — chỉ sau Gate 1, khi cần đổi baseline

State: `PENDING` (dừng phần phụ thuộc) | `APPROVED` (sửa file có kiểm soát, tag mới) | `REJECTED`.

<!-- table:cr -->
| CR | Reason | Affects | Proposal | State |
|---|---|---|---|---|

## Gate 4 — nghiệm thu (R54)

- [ ] `TC check <dir>` exit 0
- [ ] Type-check + lint PASS
- [ ] Unit/integration test PASS hoặc N/A
- [ ] Production build PASS
- [ ] 0 TC FAIL/BLOCKED (xem AUTO)
