# INDEX — TASKS · message-video-call
<!-- GENERATED bởi trace-check.mjs sync — KHÔNG sửa tay (R27) -->

| TASK | Name | Depends | Phases | REQ | Files |
| --- | --- | --- | --- | --- | --- |
| TASK-01 | Đóng gap chat P0 trên luồng hiện có | none | PH-01.1, PH-01.2, PH-01.3 | REQ-MSG-01, REQ-MSG-02, REQ-MSG-03, REQ-MSG-04, REQ-MSG-11 | [task](execution/task-01/task.md) · [tc](execution/task-01/testcase.md) |
| TASK-02 | CallSession và HTTP state machine | TASK-01 | PH-02.1, PH-02.2, PH-02.3, PH-02.4 | REQ-MSG-05, REQ-MSG-06, REQ-MSG-10, REQ-MSG-11 | [task](execution/task-02/task.md) · [tc](execution/task-02/testcase.md) |
| TASK-03 | Signaling có phân quyền và đồng bộ call | TASK-02 | PH-03.1, PH-03.2, PH-03.3 | REQ-MSG-05, REQ-MSG-08, REQ-MSG-10, REQ-MSG-11 | [task](execution/task-03/task.md) · [tc](execution/task-03/testcase.md) |
| TASK-04 | WebRTC media, điều khiển và call UI | TASK-03 | PH-04.1, PH-04.2, PH-04.3, PH-04.4 | REQ-MSG-07, REQ-MSG-08, REQ-MSG-09, REQ-MSG-10, REQ-MSG-12 | [task](execution/task-04/task.md) · [tc](execution/task-04/testcase.md) |
