from rest_framework.routers import DefaultRouter
from .views import WorkflowViewSet
from django.urls import path, include
from .views import WorkflowAPIView,GetWorkflowSteps,ExecuteWorkflow,GetStateAPI,LatestExectuion,ExecutionHistoryAPI,StepTypesAPI

router = DefaultRouter()
router.register(r'workflows', WorkflowViewSet, basename='workflow')

urlpatterns = [
    path('', include(router.urls)), 
    path('view/',WorkflowAPIView.as_view()), 
    path('steps/',GetWorkflowSteps.as_view()),
    path('execute-workflow/<uuid:workflow_id>/',ExecuteWorkflow.as_view()),
    path('get-state/<str:entity_type>/<str:id>/',GetStateAPI.as_view()),
    path('latest-execution/<str:workflow_id>/',LatestExectuion.as_view()),
    path('execution-history/<str:workflow_id>/',ExecutionHistoryAPI.as_view()),
    path('step-types/', StepTypesAPI.as_view()),
]