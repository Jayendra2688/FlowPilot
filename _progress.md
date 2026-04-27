# FlowPilot — Interview Prep Progress
**Level:** SDE2 | **Stack:** Django, DRF, Celery, PostgreSQL, Redis, React

---

## Project Summary (Your Elevator Pitch)
A Zapier-style DAG-based workflow automation engine. Users define workflows as a directed acyclic graph of steps with dependencies. The engine executes steps asynchronously via Celery workers, handles retries with exponential backoff, prevents duplicate execution using optimistic locking, and supports dynamic data passing between steps via template interpolation ({{step_1.response_data.name}}).

---

## Architecture: Key Components

| Component | File | Role |
|---|---|---|
| Models | `workflows/models.py` | Workflow, WorkflowStep, WorkflowExecution, TaskExecution, TaskExeErrorTraceback |
| Orchestrator | `workflows/orchestrator.py` | Creates execution records, fires root steps via Celery |
| Task Engine | `workflows/tasks.py` | Core Celery task, retry logic, trigger_next_steps, task registry |
| Executor (old) | `workflows/executor.py` | Legacy synchronous executor (superseded) |
| Utils | `workflows/utils.py` | BFS-based level-wise DAG traversal, cycle detection |
| Views | `workflows/views.py` | REST APIs: execute, status, history, step types |

---

## Topics & Status

| Topic | Status | Notes |
|---|---|---|
| DAG model + depends_on M2M | [ ] | Workflow → Steps → ManyToMany self-referential |
| Orchestrator flow | [ ] | How execution starts, root step detection |
| Celery async execution | [ ] | execute_workflow_task, apply_async with queue |
| trigger_next_steps + optimistic locking | [ ] | `update(status='queued')` race condition prevention |
| Retry + exponential backoff | [ ] | schedule_retry, TaskExeErrorTraceback |
| Template interpolation | [ ] | resolve_config, {{step_X.field}} regex |
| TaskRegistry pattern | [ ] | Decorator-based registration, output_schema |
| Cycle detection (utils) | [ ] | BFS topological sort, visited != len(steps) |
| DB indexes design | [ ] | Why each index, query patterns |
| Idempotency / duplicate prevention | [ ] | unique_together on (workflow_execution, step) |
| State machine: execution statuses | [ ] | pending → queued → running → completed/failed/retrying |
| Observability design | [ ] | TaskExeErrorTraceback, celery_task_id, worker_id |
| Scale / production gaps | [ ] | What you'd add: Redis lock, distributed workers |
| Behavioral questions (why this design) | [ ] | |

---

## Practice Q&A Log

### Round 1 — Not started

---

## Weak Points to Revisit
- (fill in as you practice)

---

## Key Numbers / Claims to Remember
- Template interpolation: regex `{{step_(\d+)\.([^}]+)}}`
- Retry: exponential backoff `delay * 2^retry_count` (60s, 120s, 240s...)
- Locking: `TaskExecution.objects.filter(id=X, status='pending').update(status='queued')` — returns count 0 or 1
- Cycle detection: BFS topological sort, raise ValueError if visited != len(steps)
