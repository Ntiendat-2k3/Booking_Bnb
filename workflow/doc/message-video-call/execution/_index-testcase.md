# INDEX — TEST CASE & TRACE · message-video-call
<!-- GENERATED bởi trace-check.mjs sync — KHÔNG sửa tay (R27) -->

## Trace matrix: REQ → TASK → PHASE → TC
| REQ | TASK | PHASE | TC | PASS/Total | Status |
| --- | --- | --- | --- | --- | --- |
| REQ-MSG-01 | TASK-01 | PH-01.1 | TC-01.1-01, TC-01.1-02, TC-01.1-05 | 0/3 | TODO |
| REQ-MSG-02 | TASK-01 | PH-01.1, PH-01.2, PH-01.3 | TC-01.1-01, TC-01.1-03, TC-01.1-04, TC-01.2-01, TC-01.2-05, TC-01.3-03 | 0/6 | TODO |
| REQ-MSG-03 | TASK-01 | PH-01.2, PH-01.3 | TC-01.2-01, TC-01.2-02, TC-01.2-03, TC-01.2-04, TC-01.3-02 | 0/5 | TODO |
| REQ-MSG-04 | TASK-01 | PH-01.3 | TC-01.3-01, TC-01.3-02, TC-01.3-03, TC-01.3-04, TC-01.3-05 | 0/5 | TODO |
| REQ-MSG-05 | TASK-02, TASK-03 | PH-02.1, PH-02.2, PH-03.1 | TC-02.1-01, TC-02.1-02, TC-02.2-01, TC-02.2-02, TC-02.2-03, TC-02.2-04, TC-03.1-01, TC-03.1-02, TC-03.1-03 | 0/9 | TODO |
| REQ-MSG-06 | TASK-02 | PH-02.1, PH-02.3, PH-02.4 | TC-02.1-01, TC-02.1-03, TC-02.3-01, TC-02.3-02, TC-02.3-03, TC-02.3-04, TC-02.3-05, TC-02.4-01, TC-02.4-04 | 0/9 | TODO |
| REQ-MSG-07 | TASK-04 | PH-04.1, PH-04.4 | TC-04.1-01, TC-04.1-02, TC-04.1-03, TC-04.1-04, TC-04.4-03 | 0/5 | TODO |
| REQ-MSG-08 | TASK-03, TASK-04 | PH-03.2, PH-03.3, PH-04.1, PH-04.3 | TC-03.2-01, TC-03.2-02, TC-03.2-03, TC-03.2-04, TC-03.3-02, TC-04.1-01, TC-04.1-05, TC-04.3-03 | 0/8 | TODO |
| REQ-MSG-09 | TASK-04 | PH-04.2, PH-04.4 | TC-04.2-01, TC-04.2-02, TC-04.2-03, TC-04.2-04, TC-04.4-03 | 0/5 | TODO |
| REQ-MSG-10 | TASK-02, TASK-03, TASK-04 | PH-02.4, PH-03.3, PH-04.3 | TC-02.4-01, TC-02.4-02, TC-02.4-03, TC-03.3-01, TC-03.3-02, TC-03.3-03, TC-04.3-01, TC-04.3-02, TC-04.3-04 | 0/9 | TODO |
| REQ-MSG-11 | TASK-01, TASK-02, TASK-03 | PH-01.1, PH-01.2, PH-02.1, PH-02.2, PH-02.3, PH-03.1, PH-03.2, PH-03.3 | TC-01.1-02, TC-01.1-04, TC-01.2-05, TC-02.1-03, TC-02.2-01, TC-02.2-02, TC-02.3-04, TC-03.1-02, TC-03.1-04, TC-03.2-02, TC-03.2-03, TC-03.3-04 | 0/12 | TODO |
| REQ-MSG-12 | TASK-04 | PH-04.4 | TC-04.4-01, TC-04.4-02 | 0/2 | TODO |

## Business Rule coverage
| BR | REQ | TC | PASS/Total |
| --- | --- | --- | --- |
| BR-01 | REQ-MSG-01 | TC-01.1-01, TC-01.1-02, TC-01.1-05 | 0/3 |
| BR-02 | REQ-MSG-02 | TC-01.1-01, TC-01.1-03, TC-01.1-04, TC-01.2-01, TC-01.2-05, TC-01.3-03 | 0/6 |
| BR-03 | REQ-MSG-03 | TC-01.2-01, TC-01.2-02, TC-01.2-03, TC-01.2-04, TC-01.3-02 | 0/5 |
| BR-04 | REQ-MSG-04 | TC-01.3-01, TC-01.3-02, TC-01.3-03, TC-01.3-04, TC-01.3-05 | 0/5 |
| BR-05 | REQ-MSG-05 | TC-02.1-01, TC-02.1-02, TC-02.2-01, TC-02.2-02, TC-02.2-03, TC-02.2-04, TC-03.1-01, TC-03.1-02, TC-03.1-03 | 0/9 |
| BR-06 | REQ-MSG-06 | TC-02.3-01, TC-02.3-02, TC-02.3-03, TC-02.3-04 | 0/4 |
| BR-07 | REQ-MSG-06 | TC-02.1-01, TC-02.1-03, TC-02.3-01, TC-02.3-02, TC-02.3-03, TC-02.3-05, TC-02.4-01, TC-02.4-04 | 0/8 |
| BR-08 | REQ-MSG-07 | TC-04.1-01, TC-04.1-02, TC-04.1-03, TC-04.1-04, TC-04.4-03 | 0/5 |
| BR-09 | REQ-MSG-08 | TC-03.2-01, TC-03.2-02, TC-03.2-03, TC-03.2-04, TC-03.3-02, TC-04.1-01, TC-04.1-05, TC-04.3-03 | 0/8 |
| BR-10 | REQ-MSG-09 | TC-04.2-01, TC-04.2-02, TC-04.2-03, TC-04.2-04, TC-04.4-03 | 0/5 |
| BR-11 | REQ-MSG-10 | TC-02.4-01, TC-02.4-02, TC-02.4-03, TC-03.3-01, TC-03.3-02, TC-03.3-03, TC-04.3-01, TC-04.3-02, TC-04.3-04 | 0/9 |
| BR-12 | REQ-MSG-11 | TC-01.1-02, TC-01.1-04, TC-01.2-05, TC-02.1-03, TC-02.2-01, TC-02.2-02, TC-02.3-04, TC-03.1-02, TC-03.1-04, TC-03.2-02, TC-03.2-03, TC-03.3-04 | 0/12 |
| BR-13 | REQ-MSG-12 | TC-04.4-01, TC-04.4-02 | 0/2 |

## Risk coverage
| RISK | Level | Owner | TC | PASS/Total | Status |
| --- | --- | --- | --- | --- | --- |
| RISK-01 | HIGH | TASK-03 | TC-03.1-02, TC-03.2-02 | 0/2 | TODO |
| RISK-02 | HIGH | TASK-02 | TC-02.1-02, TC-02.3-03 | 0/2 | TODO |
| RISK-03 | HIGH | TASK-04 | TC-04.2-02, TC-04.2-03 | 0/2 | TODO |
| RISK-04 | HIGH | TASK-02 | TC-02.4-01, TC-02.4-03 | 0/2 | TODO |
| RISK-05 | MED | TASK-01 | TC-01.1-05 | 0/1 | TODO |
| RISK-06 | MED | TASK-04 | TC-04.3-03 | 0/1 | TODO |

## API coverage
| API | Endpoint | State | TC | PASS/Total |
| --- | --- | --- | --- | --- |
| API-01 | GET /api/v1/chat và GET /api/v1/chat/:id | VERIFIED | TC-01.1-01, TC-01.1-03, TC-01.1-04, TC-01.1-05, TC-01.3-03 | 0/5 |
| API-02 | POST /api/v1/chat/listings/:listingId | VERIFIED | TC-01.1-01, TC-01.1-02, TC-01.1-05 | 0/3 |
| API-03 | GET/POST /api/v1/chat/:id/messages | VERIFIED | TC-01.2-01, TC-01.2-02, TC-01.2-03, TC-01.2-04, TC-01.2-05, TC-01.3-02, TC-01.3-03, TC-01.3-05 | 0/8 |
| API-04 | PATCH /api/v1/chat/:id/read; GET /api/v1/chat/unread; GET /api/v1/chat/socket-ticket | VERIFIED | TC-01.3-03 | 0/1 |
| API-05 | SRS §11.3 proposal | OPEN | TC-02.2-01, TC-02.2-02, TC-02.2-03, TC-02.2-04, TC-02.4-01, TC-02.4-02, TC-02.4-03, TC-03.1-01, TC-03.3-01, TC-03.3-02, TC-03.3-03, TC-03.3-04, TC-04.3-01, TC-04.3-02, TC-04.3-04 | 0/15 |
| API-06 | SRS §11.3 proposal | OPEN | TC-02.3-01, TC-02.3-02, TC-02.3-03, TC-02.3-04, TC-02.3-05, TC-02.4-01, TC-02.4-02, TC-02.4-03, TC-02.4-04, TC-04.2-02, TC-04.2-03 | 0/11 |
| API-07 | Socket.IO /chat hiện tại | VERIFIED | TC-01.3-01, TC-01.3-02, TC-01.3-03, TC-01.3-04, TC-01.3-05 | 0/5 |
| API-08 | SRS §12 proposal | OPEN | TC-03.1-01, TC-03.1-02, TC-03.1-03, TC-03.1-04, TC-03.2-01, TC-03.2-02, TC-03.2-03, TC-03.2-04, TC-03.3-01, TC-03.3-02, TC-03.3-03, TC-03.3-04, TC-04.1-01, TC-04.1-05, TC-04.3-01, TC-04.3-02, TC-04.3-03 | 0/17 |

## Test theo Task
| TASK | Total | PASS | FAIL | BLOCKED | UNTESTED |
| --- | --- | --- | --- | --- | --- |
| TASK-01 | 15 | 0 | 0 | 0 | 15 |
| TASK-02 | 16 | 0 | 0 | 0 | 16 |
| TASK-03 | 12 | 0 | 0 | 0 | 12 |
| TASK-04 | 16 | 0 | 0 | 0 | 16 |
