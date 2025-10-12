from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

class Workflow(models.Model):
    """
    The main workflow container - THIS IS THE TEMPLATE/BLUEPRINT
    
    Think of this like a recipe:
    - Recipe = Workflow (what steps to follow)
    - Cooking session = WorkflowExecution (actual attempt to make the dish)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    # Trigger configuration
    trigger_type = models.CharField(
        max_length=50,
        choices=[
            ('manual', 'Manual'),
            ('webhook', 'Webhook'),
            ('schedule', 'Schedule'),
        ],
        default='manual'
    )
    trigger_config = models.JSONField(default=dict)

    # Production enhancements
    version = models.IntegerField(default=1)  
    # WHY: Workflows evolve. Version 1 might have 3 steps, Version 2 might have 5 steps.
    # This lets you track which version executed and rollback if needed.
    
    is_active = models.BooleanField(default=True)
    # WHY: Instead of deleting workflows, mark as inactive. Preserves execution history.
    
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL,  # If user is deleted, keep workflow but set to NULL
        null=True, 
        blank=True,
        related_name='workflows'
    )
    # WHY: In production, you need to know who created what for debugging and permissions
    
    # Execution statistics (we'll populate these later)
    total_executions = models.IntegerField(default=0)
    successful_executions = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Database optimization: Most queries will be "get active workflows for user"
        indexes = [
            models.Index(fields=['created_by', 'is_active']),
            models.Index(fields=['created_at']),  # For sorting by newest
        ]

    def __str__(self):
        return f"{self.name} (v{self.version})"
    
    @property
    def success_rate(self):
        """Calculate success percentage for monitoring"""
        if self.total_executions == 0:
            return 0
        return (self.successful_executions / self.total_executions) * 100
    
class WorkflowStep(models.Model):
    """
    Individual actions in a workflow - THESE ARE THE RECIPE STEPS
    
    Example: 
    Step 1: "Send OTP" (step_type='send_sms', config={'phone': '+91123'})
    Step 2: "Create Patient" (step_type='create_patient', config={'name': 'John'})
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    name = models.CharField(max_length=255)
    step_type = models.CharField(max_length=50)  # send_sms, create_invoice, etc.
    step_order = models.IntegerField()
    config = models.JSONField(default=dict)
    
    # Production enhancements for workflow dependencies
    depends_on = models.ManyToManyField(
        'self', 
        blank=True,
        symmetrical=False,  # If A depends on B, doesn't mean B depends on A
        related_name='dependents'
    )
    # WHY: For complex workflows like:
    # Step 1: Send OTP
    # Step 2: Verify OTP (depends_on=[Step 1])
    # Step 3: Create Patient (depends_on=[Step 2])
    # Step 4: Send Welcome Email (depends_on=[Step 3])
    # Step 5: Update CRM (depends_on=[Step 3])  # Parallel with Step 4
    
    # Retry configuration
    max_retries = models.IntegerField(default=3)
    retry_delay_seconds = models.IntegerField(default=60)
    timeout_seconds = models.IntegerField(default=300)  # 5 minutes default
    
    # Conditional execution
    condition = models.JSONField(
        default=dict,
        help_text="JSON condition for when this step should run"
    )
    # Example: {"previous_step_result.status": "success", "patient.age": ">18"}

    class Meta:
        ordering = ['step_order']
        unique_together = ['workflow', 'step_order']
        indexes = [
            models.Index(fields=['workflow', 'step_order']),
        ]

    def __str__(self):
        return f"{self.workflow.name} - Step {self.step_order}: {self.name}"
    
    def get_dependencies(self):
        """Get all steps this step depends on"""
        return self.depends_on.all().order_by('step_order')
    
    def can_execute(self, completed_steps):
        """Check if all dependencies are completed"""
        dependencies = self.get_dependencies()
        return all(dep.id in completed_steps for dep in dependencies)


class WorkflowExecution(models.Model):
    """
    A SINGLE RUN of a workflow - THIS IS THE COOKING SESSION
    
    Key insight: One workflow template can have many executions
    Example:
    - Workflow: "Patient Registration" (template)
    - Execution 1: John Doe registers at 10:30 AM (success)
    - Execution 2: Jane Smith registers at 10:31 AM (failed at step 2)
    - Execution 3: Bob Johnson registers at 10:32 AM (currently running)
    """
    
    # Status choices - these are the core states
    STATUS_CHOICES = [
        ('pending', 'Pending'),     # Queued but not started
        ('running', 'Running'),     # Currently executing
        ('completed', 'Completed'), # All steps succeeded
        ('failed', 'Failed'),       # At least one step failed
        ('cancelled', 'Cancelled'), # User stopped it
        ('paused', 'Paused'),       # Temporarily stopped (for manual approval)
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='executions'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Execution metadata
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Input data that triggered this execution
    input_data = models.JSONField(default=dict)
    # Example: {"patient_phone": "+91123", "patient_name": "John", "signup_source": "web"}
    
    # Final result/output
    output_data = models.JSONField(default=dict)
    # Example: {"patient_id": 12345, "otp_sent": True, "welcome_email_sent": True}
    
    # Error tracking
    error_message = models.TextField(blank=True)
    failed_step = models.ForeignKey(
        'WorkflowStep',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='failed_executions'
    )
    
    # Execution context
    triggered_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    trigger_source = models.CharField(
        max_length=50,
        choices=[
            ('manual', 'Manual Trigger'),
            ('webhook', 'Webhook'),
            ('schedule', 'Scheduled'),
            ('retry', 'Retry'),
        ],
        default='manual'
    )
    
    # For retries - link to original execution
    parent_execution = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='retries'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['workflow', 'status']),
            models.Index(fields=['status', 'started_at']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']  # Newest first

    def __str__(self):
        return f"{self.workflow.name} - {self.status} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def duration(self):
        """Calculate execution duration"""
        if not self.started_at:
            return None
        end_time = self.completed_at or timezone.now()
        return end_time - self.started_at
    
    def mark_as_started(self):
        """Mark execution as started"""
        self.status = 'running'
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at'])
    
    def mark_as_completed(self, output_data=None):
        """Mark execution as successfully completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if output_data:
            self.output_data = output_data
        self.save(update_fields=['status', 'completed_at', 'output_data'])
        
        # Update workflow statistics
        self.workflow.total_executions += 1
        self.workflow.successful_executions += 1
        self.workflow.save(update_fields=['total_executions', 'successful_executions'])
    
    def mark_as_failed(self, error_message, failed_step=None):
        """Mark execution as failed"""
        self.status = 'failed'
        self.completed_at = timezone.now()
        self.error_message = error_message
        if failed_step:
            self.failed_step = failed_step
        self.save(update_fields=['status', 'completed_at', 'error_message', 'failed_step'])
        
        # Update workflow statistics
        self.workflow.total_executions += 1
        self.workflow.save(update_fields=['total_executions'])


class TaskExecution(models.Model):
    """
    Tracks execution of a SINGLE STEP within a workflow execution
    
    Think of it like this:
    - WorkflowExecution = "Cooking the entire meal"
    - TaskExecution = "Chopping onions", "Boiling water", "Adding spices"
    
    Example: Patient registration workflow execution has 3 task executions:
    1. TaskExecution: Send OTP (status=completed, result={"otp": "123456"})
    2. TaskExecution: Create Patient (status=running, result=null)
    3. TaskExecution: Send Welcome (status=pending, result=null)
    """
    
    # Same status choices as WorkflowExecution
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'), 
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('skipped', 'Skipped'),     # For conditional steps that don't meet criteria
        ('retrying', 'Retrying'),   # Currently in retry loop
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    # Links to the workflow execution and the step definition
    workflow_execution = models.ForeignKey(
        WorkflowExecution,
        on_delete=models.CASCADE,
        related_name='task_executions'
    )
    step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.CASCADE,
        related_name='executions'
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Execution timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Task-specific input (can be different from workflow input)
    input_data = models.JSONField(default=dict)
    # Example: {"phone": "+91123", "message": "Your OTP is {otp}"}
    
    # Task output/result
    result = models.JSONField(null=True, blank=True)
    # Example: {"otp_sent": True, "sms_id": "msg_12345", "cost": 0.05}
    
    # Error handling
    error_message = models.TextField(blank=True)
    error_traceback = models.TextField(blank=True)  # Full Python traceback for debugging
    
    # Retry tracking
    retry_count = models.IntegerField(default=0)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    
    # Execution metadata
    worker_id = models.CharField(max_length=255, blank=True)  # Which Celery worker ran this
    celery_task_id = models.CharField(max_length=255, blank=True)  # Celery task ID for tracking
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['workflow_execution', 'status']),
            models.Index(fields=['status', 'next_retry_at']),  # For finding tasks to retry
            models.Index(fields=['step', 'status']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['step__step_order']  # Order by step sequence
        unique_together = ['workflow_execution', 'step']  # One execution per step per workflow run

    def __str__(self):
        return f"{self.workflow_execution} - {self.step.name} ({self.status})"
    
    @property 
    def duration(self):
        """Calculate task execution duration"""
        if not self.started_at:
            return None
        end_time = self.completed_at or timezone.now()
        return end_time - self.started_at
    
    def mark_as_started(self, worker_id=None):
        """Mark task as started"""
        self.status = 'running'
        self.started_at = timezone.now()
        if worker_id:
            self.worker_id = worker_id
        self.save(update_fields=['status', 'started_at', 'worker_id'])
    
    def mark_as_completed(self, result=None):
        """Mark task as successfully completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if result:
            self.result = result
        self.save(update_fields=['status', 'completed_at', 'result'])
    
    def mark_as_failed(self, error_message, traceback=None):
        """Mark task as failed"""
        self.status = 'failed'
        self.completed_at = timezone.now()
        self.error_message = error_message
        if traceback:
            self.error_traceback = traceback
        self.save(update_fields=['status', 'completed_at', 'error_message', 'error_traceback'])
    
    def schedule_retry(self):
        """Schedule this task for retry"""
        if self.retry_count >= self.step.max_retries:
            self.mark_as_failed(f"Max retries ({self.step.max_retries}) exceeded")
            return False
        
        # Calculate next retry time with exponential backoff
        delay_seconds = self.step.retry_delay_seconds * (2 ** self.retry_count)  # 60, 120, 240, 480...
        self.next_retry_at = timezone.now() + timezone.timedelta(seconds=delay_seconds)
        self.retry_count += 1
        self.status = 'retrying'
        self.save(update_fields=['next_retry_at', 'retry_count', 'status'])
        return True
    
    def is_ready_for_execution(self):
        """Check if this task is ready to run (dependencies met)"""
        if self.status != 'pending':
            return False
            
        # Check if all dependency steps are completed
        completed_steps = set(
            self.workflow_execution.task_executions
            .filter(status='completed')
            .values_list('step_id', flat=True)
        )
        
        return self.step.can_execute(completed_steps)