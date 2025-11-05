import sys
import os

# Add project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "flowpilot.settings")

import django
django.setup()

from workflows.models import Workflow,WorkflowStep

workflow = Workflow.objects.get_or_create(
    name ="Testing Workflow",
)
steps = []
for i in range(1,7):
    step = WorkflowStep.objects.create(
        workflow = workflow,
        step_order = i,
        step_type = 'display_for_test'
    )
    steps.append(step)
    

steps[1].depends_on.add(steps[0])

steps[2].depends_on.add(steps[0])

steps[3].depends_on.add(steps[0])

steps[4].depends_on.add(steps[1],steps[2])

steps[5].depends_on.add(steps[4],steps[3])