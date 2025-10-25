# workflows/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Workflow
from .serializers import WorkflowSerializer
from .executor import execute_workflow
from django.views.generic import TemplateView
from rest_framework.views import APIView

class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.all()
    serializer_class = WorkflowSerializer
    lookup_field = 'id'
    
    @action(detail = True,methods=['post'])
    def execute(self,request,id=None):
        wf = self.get_object()
        execute_workflow(wf.workflow_json)
        return Response({"status":"executed"})
    
class WorkflowAPIView(APIView):
    
    def get(self,reqeust):
        return Response({'message':'Hello Jay,I connected react + django app'})
        