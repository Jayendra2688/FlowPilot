"""
Celery configuration for FlowPilot

This module sets up Celery for distributed task execution in FlowPilot.
It's the heart of our async workflow execution system.
"""

import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowpilot.settings')

# Create Celery app instance
app = Celery('flowpilot')

# Configure Celery using Django settings
# namespace='CELERY' means all celery-related settings will have CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all installed apps
# This looks for tasks.py files in each Django app
app.autodiscover_tasks()

# Optional: Add debug task for testing
@app.task(bind=True)
def debug_task(self):
    """Debug task to test Celery setup"""
    print(f'Request: {self.request!r}')
    return 'Celery is working!'