from rest_framework.routers import DefaultRouter
from .views import WorkflowViewSet
from django.urls import path, include
from .views import WorkflowAPIView

router = DefaultRouter()
router.register(r'workflows', WorkflowViewSet, basename='workflow')

urlpatterns = [
    path('', include(router.urls)), 
    path('view/',WorkflowAPIView.as_view()), 
    
]