from django.db import models
import uuid

class Workflow(models.Model):
    """The main workflow container"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4) #making
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

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
class WorkflowStep(models.Model):
    """Individual actions in a workflow"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='steps'
    )#create backwards relation workflow_obj.steps will give workflow_steps
    name = models.CharField(max_length=255)
    step_type = models.CharField(max_length=50)  # send_sms, create_invoice
    step_order = models.IntegerField()
    config = models.JSONField(default=dict)

    class Meta:
        ordering = ['step_order'] #sort step_order by asending order
        unique_together = ['workflow', 'step_order']

    def __str__(self):
        return f"{self.workflow.name} - Step {self.step_order}: {self.name}"