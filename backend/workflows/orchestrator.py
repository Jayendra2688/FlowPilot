#brain of the code glues everthing togethere
from .models import WorkflowExecution,Workflow,WorkflowStep,TaskExecution
from .tasks import execute_workflow_task
class Orchestrator:
    def __init__(self,workflow_id,input_data=None):
        self.workflow_id = workflow_id
        pass
    
    def execute(self,input_data=None):
        #create a workflow_execution with input_data
        #create TaskExecutions too
        #and triggers the no depenedent steps
        #how to find non dependednt steps
        workflow = Workflow.objects.filter(id = self.workflow_id).last()
        print(self.workflow_id)
        if not workflow:
            raise Exception("Workflow Not found")
        workflow_execution = WorkflowExecution.objects.create(
            workflow = workflow,
            input_data = input_data
        )
        workflow_execution.mark_as_started()
        step_map = {}
        for step in workflow.steps.all():
            #create a taskexecution for each step
            #check the step has depended on others
            task_exe = None
            if not step.get_dependencies():
                #this step may be the first step
                task_exe = TaskExecution.objects.create(
                    workflow_execution = workflow_execution,
                    step = step,
                    input_data = input_data
                    )
                print("execute_workflow_task",task_exe.id)
                print("TASK APP:", execute_workflow_task.app)
                print("DEFAULT QUEUE:", execute_workflow_task.app.conf.task_default_queue)
                print("BROKER:", execute_workflow_task.app.conf.broker_url)
                res = execute_workflow_task.apply_async(
                        args=[task_exe.id],
                        queue="workflows",
                        exchange="workflows",
                        routing_key="workflows",
                    )
                print("celery async result", res.id)
            else:
                #input of these steps is output of other dependent steps
                task_exe = TaskExecution.objects.create(
                    workflow_execution = workflow_execution,
                    step = step
                )
            step_map[str(step.id)] = str(task_exe.id)
        return {"workflow":str(workflow_execution.id),"steps":step_map}
    