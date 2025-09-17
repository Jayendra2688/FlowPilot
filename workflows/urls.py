from django.urls import path
from .views import WorkflowListCreateView, WorkflowRetrieveUpdateDestroyView

urlpatterns = [
    path("workflows/", WorkflowListCreateView.as_view(), name="workflow-list"),
    path("workflows/<uuid:id>/", WorkflowRetrieveUpdateDestroyView.as_view(), name="workflow-detail"),
]
