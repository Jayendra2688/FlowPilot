  1. What You're Building

  A DAG-based workflow execution engine — think Airflow-lite or Zapier-clone.

  Core system: Users define workflows as directed acyclic graphs (steps with dependencies), and the engine executes them
  asynchronously with retry logic, state tracking, and real-time status monitoring.

  Problems you're solving:
  - Async task orchestration (Celery + dependency resolution)
  - State tracking across distributed workers
  - Retry/failure handling with exponential backoff

  ---
  2. Evaluation

  Well-designed:

  - UUID primary keys — correct for distributed systems
  - Separate WorkflowExecution from Workflow — clean template/instance separation
  - TaskRegistry pattern — open/closed principle, extensible without touching core
  - Topological sort (Kahn's algo) in utils.py — the right algorithm for DAG traversal
  - Denormalized statistics on Workflow (total_executions, success_rate) — proper read optimization

  Shallow / Poorly thought out:

  - Orchestrator doesn't chain data — Step 2 never receives Step 1's output. Your TaskExecutions are created with no input_data.
  This is the most critical missing piece.
  - trigger_next_steps is fire-and-forget — no locking. Two Celery workers completing simultaneously can both trigger the same
  next step.
  - Serializer creates dependencies in a loop — no transaction wrapping. If step 3 fails to save, you have a partial workflow in
  DB.
  - TaskExeErrorTraceback is a separate model but TaskExecution also has error_message — duplicated. Pick one.
  - Polling (3s interval) with no cleanup — you'll have multiple intervals running simultaneously after re-executions.

  Just doing CRUD:

  - The GetStateAPI is a thin wrapper around model.status — no business logic
  - No idempotency on execute_workflow — clicking Execute twice creates two executions with no guard
  - ExecutionHistoryAPI returns raw data, no aggregation, no pagination

  ---
  3. Missing Core Concepts

  ┌──────────────────┬──────────────────┬─────────────────────────────────────────────────────────────────────────┐
  │     Concept      │      Status      │                                   Gap                                   │
  ├──────────────────┼──────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Task execution   │ Partial          │ Tasks exist but output not chained to next step input                   │
  ├──────────────────┼──────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Retries          │ Coded but broken │ self.retry(eta=...) called after mark_as_failed() — contradictory state │
  ├──────────────────┼──────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Idempotency      │ Missing          │ No idempotency key on execution trigger                                 │
  ├──────────────────┼──────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Async processing │ Works            │ Celery queuing works                                                    │
  ├──────────────────┼──────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ Failure handling │ Shallow          │ Workflow marked failed on first step failure — no partial recovery      │
  ├──────────────────┼──────────────────┼─────────────────────────────────────────────────────────────────────────┤
  │ State management │ Race condition   │ Two workers can double-queue the same next step                         │
  └──────────────────┴──────────────────┴─────────────────────────────────────────────────────────────────────────┘

  ---
  4. Interview Questions

  Q1. Your trigger_next_steps checks is_ready_for_execution() and queues ready tasks. What happens if two steps complete at the
  same millisecond and both call trigger_next_steps — which both see Step 4 as ready and both queue it?

  Q2. Step 1 completes and produces {"user_id": 42}. Step 2 needs that to run. Where exactly in your code does Step 2's input_data
   get set? Trace the code path.

  Q3. You retry with exponential backoff. But schedule_retry() calls mark_as_failed() first, then self.retry() re-queues the task.
   Your TaskExecution is now in failed state but the task is still running. How does is_ready_for_execution() on the dependent
  step behave now?

  Q4. A user creates a workflow, executes it, then immediately clicks Execute again. You now have two WorkflowExecution instances.
   Both orchestrators create TaskExecution rows and queue Celery tasks. What's wrong with your trigger_next_steps — it queries by
  workflow_execution_id, so does it matter? Think about DB contention.

  Q5. Your get_levelwise_steps in utils.py does topological sort for visualization. Your trigger_next_steps in tasks.py also
  decides what to run next. These are two separate implementations of DAG traversal. What's the risk?

  Q6. If a Celery worker crashes mid-task — OS kill, OOM — execute_workflow_task never reaches mark_as_completed or
  mark_as_failed. Your TaskExecution stays running forever. How do you detect and recover from this?

  Q7. You hardcode IST timezone in ExecutionHistoryAPI. Your Celery task uses timezone.now() which is UTC. A user in a different
  timezone reads the history. What breaks and where?

  ---
  5. Next 3 High-Impact Things to Build

  #1 — Output Chaining (Data Flow Through the DAG)

  This is the soul of a workflow engine. Without it, your steps are isolated — not a workflow.

  When Step N completes, its result must become the input_data for all dependent steps. This requires:
  - Modifying trigger_next_steps to fetch parent step results
  - Merging them into the next TaskExecution's input_data
  - Deciding: what if two parents produce conflicting keys?

  This forces you to think about data contracts between steps.

  #2 — Distributed Locking on trigger_next_steps

  Right now you have a silent race condition. Fix it properly:

  # Redis-based lock
  with redis_lock(f"workflow_exec:{workflow_execution_id}"):
      # check ready steps, queue them

  This pushes you into distributed systems thinking — Redis locks, lock TTL, what happens if the lock holder crashes.

  #3 — Dead Execution Detector (Heartbeat/Watchdog)

  Tasks that get stuck in running state (worker crash) need detection and recovery. Build a periodic Celery beat task that:
  - Finds TaskExecutions in running state for > timeout_seconds
  - Marks them failed
  - Triggers retry logic or workflow failure

  This is how production systems handle infrastructure failures — it's the difference between a toy and a real system.

  ---
  Bottom Line

  Your data modeling is solid. Your orchestration logic has critical gaps that make the system incorrect, not just incomplete. The
   retry state machine is contradictory, the output chaining doesn't exist, and the race condition in trigger_next_steps will
  cause duplicate executions in production.

  The good news: these are exactly the problems that separate SDE-1 from SDE-2. Fix them in order: output chaining → distributed
  lock → watchdog.
