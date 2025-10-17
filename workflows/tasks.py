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
import time
import traceback
from typing import Dict, Any, Optional

from ..flowpilot.celery import shared_task
from django.utils import timezone

from .models import TaskExecution, WorkflowExecution

# Configure logging
logger = logging.getLogger(__name__)

# ===========================
# TASK REGISTRY SYSTEM
# ===========================

class TaskRegistry:
    """
    Central registry for all workflow tasks
    
    This allows dynamic task discovery and execution
    """
    _tasks = {}
    
    @classmethod
    def register(cls, task_type: str):
        """Decorator to register a task function"""
        def decorator(func):
            cls._tasks[task_type] = func
            logger.info(f"Registered task: {task_type}")
            return func
        return decorator
    
    @classmethod
    def get_task(cls, task_type: str):
        """Get a task function by type"""
        return cls._tasks.get(task_type)
    
    @classmethod
    def list_tasks(cls):
        """List all registered tasks"""
        return list(cls._tasks.keys())

# Global task registry instance
task_registry = TaskRegistry()

# ===========================
# CORE EXECUTION TASK
# ===========================

@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def execute_workflow_task(self, task_execution_id: str):
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
        
        ### Execute the actual task function
        result = task_func(task_execution.input_data)
        
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
            # Check if we should retry
            if task_execution.retry_count < task_execution.step.max_retries:
                # Schedule retry
                task_execution.schedule_retry()
                logger.info(f"Scheduled retry for task: {task_execution_id}")
                
                # Re-raise to trigger Celery retry
                raise self.retry(exc=exc, countdown=task_execution.step.retry_delay_seconds)
            else:
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
    Check and trigger any steps that are now ready to execute
    
    This runs after each task completion to see if new tasks can start
    """
    try:
        workflow_execution = WorkflowExecution.objects.get(id=workflow_execution_id)
        
        # Get all pending task executions
        pending_tasks = workflow_execution.task_executions.filter(status='pending')
        
        for task_exec in pending_tasks:
            if task_exec.is_ready_for_execution():
                logger.info(f"Triggering next step: {task_exec.step.name}")
                execute_workflow_task.delay(str(task_exec.id))
        
        # Check if workflow is complete
        all_tasks = workflow_execution.task_executions.all()
        if all(task.status in ['completed', 'failed', 'skipped'] for task in all_tasks):
            # All tasks are done
            failed_tasks = all_tasks.filter(status='failed')
            if failed_tasks.exists():
                workflow_execution.mark_as_failed(
                    error_message=f"{failed_tasks.count()} tasks failed",
                    failed_step=failed_tasks.first().step
                )
            else:
                # All tasks completed successfully
                workflow_execution.mark_as_completed()
                
    except Exception as exc:
        logger.error(f"Error triggering next steps: {exc}")

# ===========================
# SPECIFIC TASK IMPLEMENTATIONS
# ===========================

@task_registry.register('send_sms')
def send_sms_task(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send SMS using configured SMS service
    
    Args:
        config: Task configuration containing phone number and message
        
    Returns:
        dict: Result with SMS ID and delivery status
    """
    phone = config.get('phone')
    message = config.get('message')
    
    if not phone or not message:
        raise ValueError("SMS task requires 'phone' and 'message' in config")
    
    logger.info(f"Sending SMS to {phone}: {message}")
    
    # Simulate SMS sending (replace with actual SMS service integration)
    time.sleep(2)  # Simulate network delay
    
    # TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
    sms_id = f"sms_{int(time.time())}"
    
    return {
        'sms_sent': True,
        'sms_id': sms_id,
        'phone': phone,
        'message': message,
        'sent_at': timezone.now().isoformat(),
        'cost': 0.05  # Mock cost
    }

@task_registry.register('send_email')
def send_email_task(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send email using configured email service
    
    Args:
        config: Task configuration containing email, subject, and content
        
    Returns:
        dict: Result with email delivery status
    """
    email = config.get('email')
    subject = config.get('subject', 'FlowPilot Notification')
    content = config.get('content') or config.get('message')
    template = config.get('template')
    
    if not email:
        raise ValueError("Email task requires 'email' in config")
    
    if not content and not template:
        raise ValueError("Email task requires 'content' or 'template' in config")
    
    logger.info(f"Sending email to {email}: {subject}")
    
    # Simulate email sending
    time.sleep(1)
    
    # TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    
    return {
        'email_sent': True,
        'email': email,
        'subject': subject,
        'sent_at': timezone.now().isoformat(),
        'message_id': f"email_{int(time.time())}"
    }

@task_registry.register('create_patient')
def create_patient_task(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create patient record in the system
    
    Args:
        config: Patient information (name, phone, email, etc.)
        
    Returns:
        dict: Created patient information with ID
    """
    name = config.get('name')
    phone = config.get('phone')
    email = config.get('email')
    
    if not name:
        raise ValueError("Patient creation requires 'name' in config")
    
    logger.info(f"Creating patient record for {name}")
    
    # Simulate database operation
    time.sleep(1)
    
    # TODO: Integrate with actual patient management system
    patient_id = int(time.time())  # Mock patient ID
    
    return {
        'patient_created': True,
        'patient_id': patient_id,
        'name': name,
        'phone': phone,
        'email': email,
        'created_at': timezone.now().isoformat()
    }

@task_registry.register('http_request')
def http_request_task(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Make HTTP request to external service
    
    Args:
        config: HTTP request configuration (url, method, headers, data)
        
    Returns:
        dict: HTTP response information
    """
    import requests
    
    url = config.get('url')
    method = config.get('method', 'GET').upper()
    headers = config.get('headers', {})
    data = config.get('data')
    timeout = config.get('timeout', 30)
    
    if not url:
        raise ValueError("HTTP request requires 'url' in config")
    
    logger.info(f"Making {method} request to {url}")
    
    try:
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=data if data else None,
            timeout=timeout
        )
        
        return {
            'request_completed': True,
            'status_code': response.status_code,
            'url': url,
            'method': method,
            'response_data': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
            'response_headers': dict(response.headers),
            'duration_ms': response.elapsed.total_seconds() * 1000
        }
        
    except requests.RequestException as e:
        raise ValueError(f"HTTP request failed: {str(e)}")

@task_registry.register('delay')
def delay_task(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simple delay/wait task
    
    Args:
        config: Configuration with 'seconds' to wait
        
    Returns:
        dict: Delay completion information
    """
    seconds = config.get('seconds', 1)
    
    if not isinstance(seconds, (int, float)) or seconds < 0:
        raise ValueError("Delay task requires positive 'seconds' value")
    
    logger.info(f"Delaying for {seconds} seconds")
    
    time.sleep(seconds)
    
    return {
        'delay_completed': True,
        'delayed_seconds': seconds,
        'completed_at': timezone.now().isoformat()
    }

# Log all registered tasks on module load
logger.info(f"Registered tasks: {task_registry.list_tasks()}")