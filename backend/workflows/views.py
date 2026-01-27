# workflows/views.py
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
import pytz


from .models import Workflow,WorkflowExecution,TaskExecution
from .serializers import WorkflowSerializer,ExecuteSerializer
from .executor import execute_workflow
from django.views.generic import TemplateView
from rest_framework.views import APIView
from .orchestrator import Orchestrator
from .utils import get_levelwise_steps

ist = pytz.timezone("Asia/Kolkata")

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
    
class GetWorkflowSteps(APIView):    
    
    def get(self,req):
        id = req.GET.get('id')
        workflow = Workflow.objects.filter(id=id).last()
        if not workflow:
            return Response({"message":"object not found"},status=404)
        steps = workflow.steps.all()
        data = [{"id": s.id, "name": s.name,"step_type":s.step_type,"step_order":s.step_order,"depends_on":[d.id for d in s.depends_on.all()]} for s in steps]
        levels = get_levelwise_steps(data)
        return Response(levels)

class GetStateAPI(APIView):
    
    def get(self,request,*args,**kwargs):
        entity_type = kwargs["entity_type"]
        id = kwargs["id"]
        if not entity_type in ["workflow","step"]:
            return Response({"status":"failed","message":"Invalid Entity Type"},status=404)
        
        if entity_type=='workflow':
            workflow_exe = WorkflowExecution.objects.filter(id=id).first()
            if not workflow_exe:
                return Response({"status":"failed","message":"Workflow Excecution Not Found"},status=404)
            return Response({"status":"success","entity_status":workflow_exe.status},status=200)
        else:
            task_exe = TaskExecution.objects.filter(id=id).first()
            if not task_exe:
                return Response({"status":"failed","message":"Task Execution Not Found"},status=404)
            return Response({"status":"success","entity_status":task_exe.status},status=200)
                

class ExecuteWorkflow(APIView):
    
    def post(self,request,*args,**kwargs):
        workflow_id = kwargs["workflow_id"]
        input_data = request.data.get("input_data",{})
        workflow_id = kwargs["workflow_id"]
        serializer = ExecuteSerializer(data={"input_data":input_data,"workflow_id":workflow_id})
        serializer.is_valid(raise_exception=True)
        input_data = serializer.validated_data["input_data"]
        workflow_id = serializer.validated_data["workflow_id"]
        print("work",workflow_id)
        orchestrator =  Orchestrator(workflow_id)
        result = orchestrator.execute(input_data)
        return Response({"message":"success","result":result})

class LatestExectuion(APIView):
    
    def get(self,reqeust,*args,**kwargs):
        workflow_id = kwargs["workflow_id"]
        result = {
            "workflow":None,
            "steps":{},
        }
        if not Workflow.objects.filter(id=workflow_id).first():
            return Response({"message":"failed","result":"workflow not found"})
        
        latest_workflow_exe = WorkflowExecution.objects.filter(workflow_id=workflow_id).order_by('-created_at').first()
        
        if not latest_workflow_exe:
            return Response({"message":"success","result":result})
        else:
            task_exes = TaskExecution.objects.filter(workflow_execution = latest_workflow_exe)
            step_status = {}
            for task_exe in task_exes:
                step_status[str(task_exe.step.id)] = str(task_exe.status)
            
            result.update({
                "workflow":latest_workflow_exe.status,
                "steps":step_status
            })
            return Response({"message":"success","result":result})
        
        
class ExecutionHistoryAPI(APIView):
    
    def get(self,reqeust,*args,**kwargs):
        workflow_id = kwargs.get("workflow_id",None)
        execution_history = []
    
        
        if workflow_id and Workflow.objects.filter(id=workflow_id).exists():
            wordklow_exes = WorkflowExecution.objects.filter(workflow=workflow_id)
            for exe in wordklow_exes:
                ist_time = timezone.localtime(exe.created_at, ist)
                formatted = ist_time.strftime("%d-%m-%Y %I:%M:%S %p")
                execution_history.append({
                    "id":str(exe.id),
                    "date_time":formatted,
                    "status":exe.status,
                })
        else:
            return Response({"message":"failed","result":"workflow not found"},status=404)
        
        return Response({"mesasage":"success","result":execution_history})