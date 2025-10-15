
  🆔 UUID vs Auto-incrementing ID Trade-offs

  UUID Advantages (Why We Used It)

  1. Security & Privacy

  # Auto-incrementing ID (BAD for APIs)
  GET /api/workflows/1/
  GET /api/workflows/2/  # Easy to guess next workflow

  # UUID (GOOD for APIs) 
  GET /api/workflows/550e8400-e29b-41d4-a716-446655440000/
  # Impossible to guess other workflow IDs

  2. Distributed Systems

  # Multiple servers creating workflows simultaneously
  server_1_creates = Workflow(id=uuid4())  # No collision risk
  server_2_creates = Workflow(id=uuid4())  # No collision risk

  # vs Auto-increment would need coordination between servers

  3. No Information Leakage

  # Auto-increment reveals business metrics
  workflow_id = 1000  # "We have 1000 workflows"
  execution_id = 50000  # "We've run 50,000 executions"

  # UUID reveals nothing
  workflow_id = "550e8400-e29b-41d4-a716-446655440000"  # No business info

  UUID Disadvantages

  1. Storage Size

  -- Auto-increment: 4-8 bytes
  id BIGINT  -- 8 bytes

  -- UUID: 16 bytes  
  id UUID    -- 16 bytes (2x larger)

  2. Performance

  -- Auto-increment: Sequential, cache-friendly
  -- UUID: Random, causes page splits in B-tree indexes

  3. Readability

  # Auto-increment: Easy to read/debug
  workflow_id = 123

  # UUID: Hard to read/remember  
  workflow_id = "550e8400-e29b-41d4-a716-446655440000"

  🎯 When to Use Each

  Use UUID When:

  ✅ API-first applications (like FlowPilot)✅ Distributed/microservices architecture✅
  Security/privacy is important✅ External integrations (webhooks, public APIs)✅
  Multi-tenant systems

  Use Auto-increment When:

  ✅ Internal tools only✅ Single database setup✅ Performance is critical✅ Storage is
  constrained✅ Analytics/reporting heavy

  🏗️ For FlowPilot: UUID is the Right Choice

  Why?

  1. Workflow engines are API-first: External systems trigger workflows
  2. Security: Don't expose workflow/execution counts
  3. Future-proof: Ready for distributed deployment
  4. Industry standard: Airflow, Temporal, AWS Step Functions all use UUIDs


🧠 Model & Django ORM Concepts
on_delete=PROTECT vs CASCADE

CASCADE: Deletes all linked objects when parent is deleted
PROTECT: Prevents deletion if related records exist (safer for history, e.g. workflow executions)

Migrations

Version control for database schema
Needed when model fields/relations change
makemigrations → creates migration plan
migrate → applies changes to database

unique=True on email

Prevents duplicate emails in database
If email="" with unique=True, only one blank email allowed

Null vs Blank

null=True: Database allows NULL (empty in DB layer)
blank=True: Form validation allows empty input (validation layer)
"" (empty string) is NOT the same as NULL

Default values & blank

Fields with defaults (e.g. max_retries=3) are implicitly allowed to be blank when creating objects

Config JSON in WorkflowStep

Template placeholders like {"phone": "{{patient_phone}}"}
Values dynamically substituted during execution

Input data per TaskExecution

Each task can have different input_data (e.g. patient info)
Passed separately per execution

Database Indexing

Makes lookups faster (like optimized table of contents)
Useful for ForeignKey, unique, or frequently queried fields


⚙️ Celery & Async Concepts
Celery setup (celery.py)

Connects Celery to Django settings
Auto-discovers tasks.py from all apps
Acts as async "brain" executing background jobs

__all__ = ('celery_app',)

Explicitly exposes celery_app for imports
Allows: from project import celery_app

Worker config

CELERY_WORKER_CONCURRENCY=4: 4 parallel task slots per worker
CELERY_WORKER_PREFETCH_MULTIPLIER=1: Each slot takes only 1 task at a time (good for long tasks)
Together → up to 4 concurrent tasks per worker, fetched one by one

Task routing

CELERY_TASK_ROUTES: Sends certain tasks (e.g. workflows.tasks.*) to specific queue (e.g. workflows)

Time limits

CELERY_TASK_TIME_LIMIT=300: Hard timeout (force kill after 300s)
CELERY_TASK_SOFT_TIME_LIMIT=240: Soft timeout (graceful stop after 240s)

Result expiry

CELERY_RESULT_EXPIRES=3600: Results auto-cleaned after 1 hour

Eager mode (debug mode)

CELERY_TASK_ALWAYS_EAGER=True: Runs tasks synchronously in Django
No worker needed
Good for debugging

Redis memory

Redis = Celery's broker and result backend
Stores queued tasks, not Django data
Independent from PostgreSQL memory

Multiple workers

Can start multiple Celery workers (multiple "kitchens")
Each runs N concurrent tasks
Total parallel capacity = workers × concurrency
