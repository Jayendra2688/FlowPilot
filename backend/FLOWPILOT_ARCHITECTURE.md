# FlowPilot - Visual Workflow Orchestration System
## Architecture & Implementation Plan

> **Goal**: Build a visual, programmable workflow orchestration system that combines the ease of n8n/Zapier with the reliability of Temporal/Airflow.

---

## 🎯 End Goal

FlowPilot enables users to:
- **Create workflows visually** through a drag-and-drop UI
- **Define reusable tasks** as Python functions or API calls
- **Execute workflows asynchronously** with state tracking, retries, and real-time monitoring
- **Trigger workflows** via webhooks, schedules, or manual execution

### Example Use Case
*"When a new user signs up → Send welcome email → Create CRM entry → Notify Slack"*

---

## 🏗️ System Architecture

### Current State Analysis
Based on the existing codebase, you have:
- ✅ Django + DRF foundation
- ✅ Basic `Workflow` and `WorkflowStep` models
- ✅ Simple sequential executor
- ✅ REST API structure
- ❌ Missing: Async execution, state tracking, UI, real-time updates

### Target Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   API Gateway    │    │  Workflow       │
│   (React)       │◄──►│   (Django)       │◄──►│  Engine         │
│                 │    │                  │    │  (Orchestrator) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲                        ▲
                                │                        │
┌─────────────────┐             │                        ▼
│   Event Bus     │             │               ┌─────────────────┐
│   (Redis/       │◄────────────┘               │   Task Queue    │
│    Webhooks)    │                             │   (Celery +     │
└─────────────────┘                             │    Redis)       │
                                                 └─────────────────┘
┌─────────────────┐    ┌──────────────────┐              ▲
│   Database      │    │  Real-time       │              │
│   (PostgreSQL)  │    │  Updates         │              ▼
│                 │    │  (Channels)      │    ┌─────────────────┐
└─────────────────┘    └──────────────────┘    │   Worker Pool   │
                                                │   (Task         │
                                                │    Executors)   │
                                                └─────────────────┘
```

---

## 📦 Component Deep Dive

### 1. API Gateway (Django + DRF)
**Current**: Basic Django setup with SQLite
**Target**: Production-ready API with PostgreSQL

#### Key Endpoints
```python
# Workflow Management
POST   /api/workflows/              # Create workflow
GET    /api/workflows/              # List workflows
GET    /api/workflows/{id}/         # Get workflow details
PUT    /api/workflows/{id}/         # Update workflow
DELETE /api/workflows/{id}/         # Delete workflow

# Execution Management
POST   /api/workflows/{id}/run/     # Trigger execution
GET    /api/executions/             # List executions
GET    /api/executions/{id}/        # Get execution status
POST   /api/executions/{id}/retry/  # Retry failed execution

# Real-time Updates
GET    /ws/executions/{id}/         # WebSocket for live updates
```

#### Enhanced Models
```python
# Current models need extension:
class Workflow(models.Model):
    # Existing fields: id, name, description, trigger_type, trigger_config
    
    # Add:
    version = models.IntegerField(default=1)
    is_draft = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
class WorkflowStep(models.Model):
    # Existing fields: id, workflow, name, step_type, step_order, config
    
    # Add:
    depends_on = models.ManyToManyField('self', blank=True)  # For DAG dependencies
    retry_config = models.JSONField(default=dict)
    timeout_seconds = models.IntegerField(default=300)

# New models needed:
class WorkflowExecution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ])
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
class TaskExecution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    workflow_execution = models.ForeignKey(WorkflowExecution, on_delete=models.CASCADE)
    step = models.ForeignKey(WorkflowStep, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=[...])  # Same as above
    started_at = models.DateTimeField(null=True)
    completed_at = models.DateTimeField(null=True)
    result = models.JSONField(null=True)
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
```

### 2. Workflow Engine (Orchestrator)
**Purpose**: Brain of the system - manages DAG execution

#### Core Components
```python
# workflows/orchestrator.py
class WorkflowOrchestrator:
    def __init__(self, execution_id):
        self.execution = WorkflowExecution.objects.get(id=execution_id)
        self.workflow = self.execution.workflow
        
    def execute(self):
        """Main execution logic"""
        # 1. Build execution graph
        graph = self.build_dag()
        
        # 2. Find runnable nodes (no dependencies)
        runnable_nodes = self.get_runnable_nodes(graph)
        
        # 3. Submit to Celery queue
        for node in runnable_nodes:
            execute_task.delay(self.execution.id, node.id)
            
    def build_dag(self):
        """Convert WorkflowSteps to execution graph"""
        # Build directed acyclic graph from step dependencies
        pass
        
    def on_task_complete(self, task_execution_id, result):
        """Called when a task completes"""
        # 1. Update task status
        # 2. Check if new nodes are runnable
        # 3. Submit new tasks or mark workflow complete
        pass

# Celery tasks
@shared_task
def execute_task(execution_id, step_id):
    """Execute a single workflow step"""
    try:
        # 1. Get task details
        execution = WorkflowExecution.objects.get(id=execution_id)
        step = WorkflowStep.objects.get(id=step_id)
        
        # 2. Create TaskExecution record
        task_exec = TaskExecution.objects.create(
            workflow_execution=execution,
            step=step,
            status='running',
            started_at=timezone.now()
        )
        
        # 3. Execute the actual task
        result = TASK_REGISTRY[step.step_type](step.config)
        
        # 4. Update status
        task_exec.status = 'completed'
        task_exec.completed_at = timezone.now()
        task_exec.result = result
        task_exec.save()
        
        # 5. Notify orchestrator
        orchestrator = WorkflowOrchestrator(execution_id)
        orchestrator.on_task_complete(task_exec.id, result)
        
    except Exception as e:
        # Handle retries, mark as failed, etc.
        pass
```

### 3. Task Queue (Celery + Redis)
**Purpose**: Async task distribution and execution

#### Setup
```python
# requirements.txt additions
celery==5.3.4
redis==5.0.1
celery[redis]==5.3.4

# flowpilot/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowpilot.settings')

app = Celery('flowpilot')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# settings.py additions
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
```

### 4. Worker Pool (Task Executors)
**Purpose**: Execute individual workflow steps

#### Enhanced Task Registry
```python
# workflows/tasks.py
from celery import shared_task
import requests
import smtplib
from email.mime.text import MIMEText

TASK_REGISTRY = {}

def register_task(task_type):
    def decorator(func):
        TASK_REGISTRY[task_type] = func
        return func
    return decorator

@register_task('send_email')
def send_email_task(config):
    """Send email using SMTP"""
    # Implementation
    return {"status": "sent", "message_id": "12345"}

@register_task('http_request')
def http_request_task(config):
    """Make HTTP API call"""
    method = config.get('method', 'GET')
    url = config.get('url')
    headers = config.get('headers', {})
    data = config.get('data', {})
    
    response = requests.request(method, url, headers=headers, json=data)
    return {
        "status_code": response.status_code,
        "data": response.json() if response.headers.get('content-type') == 'application/json' else response.text
    }

@register_task('delay')
def delay_task(config):
    """Wait for specified time"""
    import time
    seconds = config.get('seconds', 1)
    time.sleep(seconds)
    return {"waited": seconds}

@register_task('conditional')
def conditional_task(config):
    """Conditional logic based on previous results"""
    condition = config.get('condition')
    # Evaluate condition and return result
    pass
```

### 5. Database Layer (PostgreSQL)
**Migration from SQLite to PostgreSQL**

```python
# settings.py - Production database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'flowpilot'),
        'USER': os.getenv('DB_USER', 'flowpilot'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'password'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# requirements.txt addition
psycopg2-binary==2.9.9
```

### 6. Event Bus (Triggers)
**Purpose**: Handle automatic workflow triggers

#### Trigger Types
```python
# workflows/triggers.py
class TriggerManager:
    def register_webhook(self, workflow_id, webhook_path):
        """Register webhook endpoint for workflow"""
        pass
        
    def register_schedule(self, workflow_id, cron_expression):
        """Register scheduled trigger"""
        pass
        
    def handle_webhook(self, webhook_path, request_data):
        """Handle incoming webhook"""
        # Find workflow by webhook_path
        # Trigger execution with request_data as input
        pass

# Webhook endpoint
@api_view(['POST'])
def webhook_handler(request, webhook_id):
    trigger_manager = TriggerManager()
    trigger_manager.handle_webhook(webhook_id, request.data)
    return Response({"status": "triggered"})
```

### 7. Frontend (React + Tailwind)
**Purpose**: Visual workflow designer and monitoring

#### Key Components
```jsx
// Components structure
src/
├── components/
│   ├── WorkflowDesigner/
│   │   ├── Canvas.jsx           # Drag-drop workflow canvas
│   │   ├── NodePalette.jsx      # Available task types
│   │   ├── NodeEditor.jsx       # Configure node properties
│   │   └── ConnectionManager.jsx # Handle node connections
│   ├── WorkflowList/
│   │   ├── WorkflowTable.jsx    # List all workflows
│   │   └── ExecutionHistory.jsx # Show execution history
│   └── ExecutionMonitor/
│       ├── LiveStatus.jsx       # Real-time execution status
│       ├── NodeStatus.jsx       # Individual node status
│       └── LogViewer.jsx        # Task logs and errors
├── hooks/
│   ├── useWebSocket.js          # WebSocket connection for live updates
│   ├── useWorkflowAPI.js        # API calls for workflow CRUD
│   └── useExecutionAPI.js       # API calls for execution management
└── utils/
    ├── dagUtils.js              # DAG validation and layout
    └── flowRenderer.js          # Convert workflow to visual representation
```

### 8. Real-time Updates (Django Channels)
**Purpose**: WebSocket communication for live status updates

```python
# requirements.txt addition
channels==4.0.0
channels-redis==4.1.0

# flowpilot/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import workflows.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowpilot.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            workflows.routing.websocket_urlpatterns
        )
    ),
})

# workflows/consumers.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class ExecutionConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.execution_id = self.scope['url_route']['kwargs']['execution_id']
        self.group_name = f'execution_{self.execution_id}'
        
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
    async def task_update(self, event):
        await self.send_json({
            'type': 'task_update',
            'task_id': event['task_id'],
            'status': event['status'],
            'result': event.get('result')
        })
```

---

## 🚀 Implementation Roadmap

### Phase 1: Enhanced Core Engine (2-3 weeks)
**Goal**: Async execution with state tracking

#### Tasks:
1. **Database Migration**
   - Switch to PostgreSQL
   - Create new models (WorkflowExecution, TaskExecution)
   - Add migration scripts

2. **Celery Integration**
   - Setup Redis + Celery
   - Create task registry system
   - Implement async task execution

3. **Enhanced Orchestrator**
   - Build DAG execution engine
   - Add retry logic and error handling
   - Implement state management

**Deliverable**: Workflows execute asynchronously with full state tracking

### Phase 2: Production API (2 weeks)
**Goal**: Complete REST API with execution management

#### Tasks:
1. **API Enhancement**
   - Add execution endpoints
   - Implement proper error handling
   - Add authentication/authorization

2. **Task Library Expansion**
   - HTTP requests
   - Email sending
   - Database operations
   - File operations

**Deliverable**: Production-ready API for workflow management

### Phase 3: Frontend Foundation (3 weeks)
**Goal**: Basic UI for workflow creation and monitoring

#### Tasks:
1. **Setup React Application**
   - Create React app with Tailwind
   - Setup API integration layer
   - Implement basic routing

2. **Workflow Designer**
   - Drag-drop canvas (use React Flow)
   - Node palette with available tasks
   - Basic node configuration

3. **Execution Monitoring**
   - List workflows and executions
   - Show execution status
   - Basic log viewer

**Deliverable**: Functional UI for creating and monitoring workflows

### Phase 4: Real-time Features (2 weeks)
**Goal**: Live updates and monitoring

#### Tasks:
1. **WebSocket Integration**
   - Setup Django Channels
   - Implement execution consumers
   - Add frontend WebSocket hooks

2. **Live Monitoring**
   - Real-time execution status updates
   - Live log streaming
   - Progress indicators

**Deliverable**: Real-time workflow monitoring

### Phase 5: Triggers & Automation (2 weeks)
**Goal**: Automated workflow execution

#### Tasks:
1. **Webhook System**
   - Dynamic webhook endpoints
   - Webhook management UI
   - Request payload handling

2. **Scheduler Integration**
   - Cron-based scheduling
   - Schedule management interface
   - Time-based triggers

**Deliverable**: Fully automated workflow execution

### Phase 6: Production Features (2-3 weeks)
**Goal**: Enterprise-ready features

#### Tasks:
1. **Reliability Features**
   - Advanced retry policies
   - Circuit breakers
   - Dead letter queues

2. **Monitoring & Analytics**
   - Execution metrics dashboard
   - Performance analytics
   - Alerting system

3. **DevOps Setup**
   - Docker Compose setup
   - CI/CD pipeline
   - Environment configurations

**Deliverable**: Production-ready FlowPilot system

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Django 5.0+ with Django REST Framework
- **Database**: PostgreSQL 15+
- **Task Queue**: Celery with Redis
- **Real-time**: Django Channels with Redis
- **API**: REST API with WebSocket support

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Workflow Visualization**: React Flow
- **State Management**: Zustand or Redux Toolkit
- **API Client**: Axios with React Query

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Message Broker**: Redis
- **Web Server**: Nginx (production)
- **Process Manager**: Gunicorn + Uvicorn

### Development Tools
- **Code Quality**: Black, isort, flake8, mypy
- **Testing**: pytest, jest
- **Documentation**: Sphinx, Storybook
- **Monitoring**: Sentry, Prometheus

---

## 📁 Final Project Structure

```
flowpilot/
├── backend/
│   ├── flowpilot/              # Django project
│   ├── workflows/              # Core workflow app
│   ├── triggers/               # Trigger management app
│   ├── monitoring/             # Monitoring & analytics app
│   ├── requirements/           # Environment-specific requirements
│   ├── docker/                 # Docker configurations
│   └── scripts/                # Management scripts
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # API services
│   │   ├── utils/              # Utility functions
│   │   └── types/              # TypeScript types
│   ├── public/                 # Static assets
│   └── package.json
├── infrastructure/
│   ├── docker-compose.yml      # Local development
│   ├── docker-compose.prod.yml # Production
│   ├── nginx/                  # Nginx configuration
│   └── monitoring/             # Monitoring stack
├── docs/                       # Documentation
├── tests/                      # Integration tests
└── scripts/                    # Deployment scripts
```

---

## 💡 Success Metrics

By the end of this implementation, FlowPilot will be:

1. **Functionally Complete**: Create, edit, execute, and monitor workflows
2. **Production Ready**: Handle concurrent executions, error recovery, scaling
3. **User Friendly**: Intuitive visual interface with real-time feedback
4. **Developer Ready**: Clean architecture, well-documented, testable
5. **Interview Ready**: Demonstrates full-stack skills, system design knowledge

**Target Capabilities**:
- Handle 100+ concurrent workflow executions
- Support 10+ different task types
- Sub-second UI response times
- 99.9% execution reliability
- Visual workflow designer with 50+ nodes

This architecture positions FlowPilot as a professional-grade workflow orchestration system that showcases advanced software engineering practices and system design skills.