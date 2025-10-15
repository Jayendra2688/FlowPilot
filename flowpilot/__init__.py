"""
FlowPilot Django Application

This ensures Celery is loaded when Django starts.
"""

# Import Celery app to ensure it's loaded when Django starts
from .celery import app as celery_app

# Make sure Celery app is available as 'celery_app'
__all__ = ('celery_app',)