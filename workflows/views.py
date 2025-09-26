# workflows/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Workflow
from .serializers import WorkflowSerializer
from .executor import execute_workflow

class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    lookup_field = 'id'
    
    @action(detail = True,methods=['post'])
    def execute(self,request,id=None):
        wf = self.get_object()
        execute_workflow(wf.workflow_json)
        return Response({"status":"executed"})