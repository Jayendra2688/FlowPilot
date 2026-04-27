from rest_framework import serializers
from .models import Workflow,WorkflowStep

class WorkflowStepSerializer(serializers.ModelSerializer):
      class Meta:
          model = WorkflowStep
          fields = ['id','name', 'step_type', 'step_order', 'config']
      

class WorkflowSerializer(serializers.ModelSerializer):
      steps = WorkflowStepSerializer(many=True)  

      class Meta:
          model = Workflow
          fields = ['id','name', 'description', 'trigger_type', 'trigger_config', 'steps','version']

      def create(self, validated_data):
          raw_steps = self.initial_data['steps']
          
          steps_valid = validated_data.pop('steps')
          
          workflow_instance = super().create(validated_data)
          
          step_map = {}
          for i,valid_step in enumerate(steps_valid):
              if not valid_step.get('config'):
                  valid_step['config'] = {}
              workflowstep_instance = WorkflowStep.objects.create(workflow=workflow_instance,**valid_step)
              frontend_id = raw_steps[i]['step_id']
              step_map[frontend_id] = workflowstep_instance
          
          for step in raw_steps:
              depends_on = step['depends_on']
              if depends_on:
                  step_instance = step_map[step['step_id']]
                  for dep in depends_on:
                      dep_step = step_map[dep]
                      step_instance.depends_on.add(dep_step)
          
          return workflow_instance
          


class ExecuteSerializer(serializers.Serializer):
    workflow_id = serializers.UUIDField(required=True)
    input_data = serializers.DictField(required=False,default = {})
    
    def validate_workflow_id(self,id):
        if not Workflow.objects.filter(id = id).exists():
            raise serializers.ValidationError("Invalid Workflow Id")
        return id
        