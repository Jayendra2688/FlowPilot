"""
FlowPilot Task Registry System

This module contains all the task functions that can be executed in workflows.
Each task is a Celery task that runs asynchronously on worker processes.

Key Concepts:
- Tasks are registered with @shared_task decorator
- Tasks receive configuration and return results
- Tasks handle their own errors and retries
- Tasks are stateless (no side effects between calls)
"""

import logging
import re
import time
import traceback
from typing import Dict, Any, Optional

from celery import shared_task
from django.utils import timezone
import requests
from .models import TaskExecution, WorkflowExecution

# Configure logging
logger = logging.getLogger(__name__)

# ===========================
# TASK REGISTRY SYSTEM
# ===========================

class TaskRegistry:
    """
    Central registry for all workflow tasks.
    Stores task function, label, and output_schema per task type.
    """
    _tasks = {}

    @classmethod
    def register(cls, task_type: str, label: str = '', output_schema: list = None):
        """Decorator to register a task function with its metadata"""
        def decorator(func):
            cls._tasks[task_type] = {
                'func': func,
                'label': label or task_type.replace('_', ' ').title(),
                'output_schema': output_schema or [],
            }
            logger.info(f"Registered task: {task_type}")
            return func
        return decorator

    @classmethod
    def get_task(cls, task_type: str):
        """Get a task function by type"""
        entry = cls._tasks.get(task_type)
        return entry['func'] if entry else None

    @classmethod
    def get_schema(cls):
        """Return metadata for all registered task types (for API)"""
        return {
            task_type: {
                'label': entry['label'],
                'output_schema': entry['output_schema'],
            }
            for task_type, entry in cls._tasks.items()
        }

    @classmethod
    def list_tasks(cls):
        """List all registered task type keys"""
        return list(cls._tasks.keys())

# Global task registry instance
task_registry = TaskRegistry()

# ===========================
# TEMPLATE RESOLUTION
# ===========================

def resolve_config(config, workflow_execution):
    """
    Scans every string value in config for {{step_X.field.nested}} templates
    and replaces them with the actual value from that step's result.
    """
    def replace_func(match):
        step_number = match.group(1)        # "1"
        path = match.group(2)               # "response_data.name"

        source_task = workflow_execution.task_executions.get(
            step__step_order=int(step_number)
        )

        keys = path.split(".")
        value = source_task.result or {}
        for key in keys:
            if not isinstance(value, dict):
                value = None
                break
            value = value.get(key)

        return str(value) if value is not None else ""

    resolved = {}
    for key, value in config.items():
        if isinstance(value, str):
            value = re.sub(
                r'\{\{step_(\d+)\.([^}]+)\}\}',
                replace_func,
                value
            )
        resolved[key] = value
    return resolved

# ===========================
# CORE EXECUTION TASK
# ===========================

@shared_task(bind=True)
def execute_workflow_task(self, task_execution_id: str):
    print("HelloExe")
    """
    Core Celery task that executes a single workflow step
    
    This is the main entry point for all workflow task execution.
    It handles the orchestration, error handling, and state management.
    
    Args:
        task_execution_id: UUID of the TaskExecution to run
        
    Returns:
        dict: Task result or error information
    """
    
    task_execution = None
    
    try:
        # Get the task execution record
        task_execution = TaskExecution.objects.get(id=task_execution_id)
        step = task_execution.step
        
        logger.info(f"Starting task execution: {task_execution_id} ({step.step_type})")
        
        # Mark task as started
        task_execution.mark_as_started(worker_id=self.request.id)
        
        # Get the task function
        task_func = task_registry.get_task(step.step_type)
        if not task_func:
            raise ValueError(f"Unknown task type: {step.step_type}")
        
        ### Resolve {{step_X.field}} templates in config for all step types
        config = resolve_config(task_execution.step.config, task_execution.workflow_execution)

        ### Execute the actual task function
        result = task_func(config)
        
        # Mark task as completed
        task_execution.mark_as_completed(result=result)
        
        logger.info(f"Task execution completed: {task_execution_id}")
        
        # Trigger next steps in the workflow
        trigger_next_steps.delay(task_execution.workflow_execution.id)
        
        return result
        
    except Exception as exc:
        error_msg = str(exc)
        error_traceback = traceback.format_exc()
        
        logger.error(f"Task execution failed: {task_execution_id} - {error_msg}")
        
        if task_execution:
            print("heel1")
            # Check if we should retry
            if task_execution.retry_count < task_execution.step.max_retries:
                print("heel2")
                # Schedule retry
                task_execution.schedule_retry(error_msg,error_traceback)
                logger.info(f"Scheduled retry for task: {task_execution_id}")
                
                # Re-raise to trigger Celery retry
                raise self.retry(exc=exc, eta=task_execution.next_retry_at)
            else:
                print("heel3")
                # Mark as permanently failed
                task_execution.mark_as_failed(error_msg, error_traceback)
                
                # Mark the entire workflow execution as failed
                workflow_execution = task_execution.workflow_execution
                workflow_execution.mark_as_failed(
                    error_message=f"Task '{task_execution.step.name}' failed: {error_msg}",
                    failed_step=task_execution.step
                )
        
        # Re-raise the exception for Celery
        raise

@shared_task
def trigger_next_steps(workflow_execution_id: str):
    """
    Check and trigger any steps that are now ready to execute.

    Uses pessimistic locking (select_for_update + skip_locked) to prevent
    two workers from queuing the same step when they both complete a dependency
    at the same time.
    """
    try:
        workflow_execution = WorkflowExecution.objects.get(id=workflow_execution_id)

        pending_tasks = workflow_execution.task_executions.filter(status='pending')

        for task_exec in pending_tasks:
            if not task_exec.is_ready_for_execution():
                continue

            # Atomic claim: lock the row and flip status to 'queued'.
            # skip_locked=True means if another worker already locked this row,
            # we skip it immediately instead of waiting.
            # Only the worker that gets claimed=1 will queue the Celery task.
            claimed = (
                    TaskExecution.objects
                    .filter(id=task_exec.id, status='pending')
                    .update(status='queued')
                )

            if claimed:
                logger.info(f"Triggering next step: {task_exec.step.name}")
                execute_workflow_task.delay(str(task_exec.id))

        # Check if workflow is complete (re-fetch to get latest statuses)
        all_tasks = workflow_execution.task_executions.all()
        terminal_statuses = {'completed', 'failed', 'skipped'}
        if all(task.status in terminal_statuses for task in all_tasks):
            failed_tasks = all_tasks.filter(status='failed')
            if failed_tasks.exists():
                workflow_execution.mark_as_failed(
                    error_message=f"{failed_tasks.count()} tasks failed",
                    failed_step=failed_tasks.first().step
                )
            else:
                workflow_execution.mark_as_completed()

    except Exception as exc:
        logger.error(f"Error triggering next steps: {exc}")

# ===========================
# TASK IMPLEMENTATIONS
# ===========================

@task_registry.register('http_request', label='HTTP Request', output_schema=['status_code', 'response_data', 'duration_ms'])
def http_request_task(config: Dict[str, Any]) -> Dict[str, Any]:
    url = config.get('url')
    method = config.get('method', 'GET').upper()
    body = config.get('body')

    if not url:
        raise ValueError("http_request requires 'url' in config")

    logger.info(f"Making {method} request to {url}")

    response = requests.request(
        method=method,
        url=url,
        json=body if body else None,
        timeout=30
    )

    try:
        response_data = response.json()
    except ValueError:
        response_data = response.text

    return {
        'status_code': response.status_code,
        'response_data': response_data,
        'duration_ms': response.elapsed.total_seconds() * 1000
    }


@task_registry.register('send_email', label='Send Email', output_schema=['email_sent', 'to', 'subject', 'sent_at'])
def send_email_task(config: Dict[str, Any]) -> Dict[str, Any]:
    from django.core.mail import send_mail

    to = config.get('to')
    subject = config.get('subject')
    body = config.get('body', '')

    if not to or not subject:
        raise ValueError("send_email requires 'to' and 'subject' in config")

    logger.info(f"Sending email to {to}: {subject}")

    send_mail(
        subject=subject,
        message=body,
        from_email=None,  # uses DEFAULT_FROM_EMAIL from settings
        recipient_list=[to],
        fail_silently=False,
    )

    return {
        'email_sent': True,
        'to': to,
        'subject': subject,
        'sent_at': timezone.now().isoformat(),
    }


@task_registry.register('delay', label='Delay', output_schema=['delay_completed', 'delayed_seconds', 'completed_at'])
def delay_task(config: Dict[str, Any]) -> Dict[str, Any]:
    seconds = config.get('seconds', 1)

    if not isinstance(seconds, (int, float)) or seconds < 0:
        raise ValueError("delay requires a positive 'seconds' value")

    logger.info(f"Delaying for {seconds} seconds")
    time.sleep(seconds)

    return {
        'delay_completed': True,
        'delayed_seconds': seconds,
        'completed_at': timezone.now().isoformat()
    }




# Log all registered tasks on module load
logger.info(f"Registered tasks: {task_registry.list_tasks()}")