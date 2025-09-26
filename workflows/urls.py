from rest_framework.routers import DefaultRouter
from .views import WorkflowViewSet
from django.urls import path, include

router = DefaultRouter()
router.register(r'workflows', WorkflowViewSet, basename='workflow')

urlpatterns = [
    path('', include(router.urls)),  
    
]