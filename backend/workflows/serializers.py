from rest_framework import serializers
from .models import Workflow

class WorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflow
        fields = "__all__"


class ExecuteSerializer(serializers.Serializer):
    workflow_id = serializers.UUIDField(required=True)
    input_data = serializers.DictField(required=False,default = {})
    
    def validate_workflow_id(self,id):
        if not Workflow.objects.filter(id = id).exists():
            raise serializers.ValidationError("Invalid Workflow Id")
        return id
        