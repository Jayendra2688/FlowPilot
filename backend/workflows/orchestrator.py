#brain of the code glues everthing togethere
from .models import WorkflowExecution,Workflow,WorkflowStep,TaskExecution
from .tasks import execute_workflow_task
class Orchestrator:
    def __init__(self,workflow_id,input_data=None):
        pass
    
    def execute(self,workflow_id,input_data=None):
        #create a workflow_execution with input_data
        #create TaskExecutions too
        #and triggers the no depenedent steps
        #how to find non dependednt steps
        workfow = Workflow.objects.filter(id = workflow_id).last()
        if not workfow:
            raise Exception("Workflow Not found")
        workflow_execution = WorkflowExecution.objects.create(
            workfow = workfow,
            input_data = input_data
        )
        workflow_execution.mark_as_started()
        
        for step in workfow.steps.all():
            #create a taskexecution for each step
            #check the step has depended on others
            
            if not step.depdepends_on:
                #this step may be the first step
                task_exe = TaskExecution.objects.create(
                    workflow_execution = workflow_execution,
                    step = step,
                    input_data = input_data
                    )
                execute_workflow_task.delay(task_exe.id)
            else:
                #input of these steps is output of other dependent steps
                task_exe = TaskExecution.objects.create(
                    workflow_execution = workflow_execution,
                    step = step
                )
                
    def is_all_tasks_exections_completed(self,wokflow_executon_id,step_ids=None):
        try:
            if not step_ids:
                step_ids = WorkflowExecution.objects.get(id = wokflow_executon_id).steps.values_list("id",flat=True)
                
            for step_id in step_ids:
                task_exe = TaskExecution.objects.get(workflow_exe_id =wokflow_executon_id,step_id =step_id)
                if task_exe.status!='failed':
                    return False,"task_failed"
                elif task_exe.status!="completed":
                    return True,"tasks_not_completed"
            return True,"tasks_complelted"
        except Exception as e:
            import traceback
            print(f"Error {e} : {traceback.format_exc()}")
            return False,"error"

    def get_runnable_tasks(self,wokflow_executon_id):
        #this returns the all the the task_exection_ids which are ready to run
        
        all_task_executions = TaskExecution.objects.filter(wokflow_executon_id=wokflow_executon_id)
        runnable_tasks = []
        for task_execution in all_task_executions:
            step = task_execution.step
            if not step.depends_on:
                runnable_tasks.append(task_execution.id)
            else:
                step_ids = step.depends_on.values_list('id')
                if self.is_all_tasks_exections_completed(wokflow_executon_id,step_ids)[0]:
                    runnable_tasks.append(task_execution.id)
         
        return runnable_tasks
    
    def on_task_complete(self,task_execution_id):
        #task_execution_id is completed
        #triggers the next task to celery
        #if all wokflow task executions are completed then mark workflow as done
        task_execution = TaskExecution.objects.filter(id = task_execution_id).last()
        if not task_execution or task_execution.status!='completed':
            raise Exception("Task is not found or not completed")
        workflow_exe = WorkflowExecution.objects.filter(id = workflow_execution_id).last()
        workflow_execution_id = task_execution.workflow_execution.id
        dependent_steps = task_execution.step.dependents.all()
        
        for dependent_step in dependent_steps:
            dependent_task_exe = TaskExecution.object.filter(workflow_execution = workflow_execution_id)
            if self.is_all_tasks_exections_completed(workflow_execution_id,[dependent_step.id])[0]:
                execute_workflow_task.delay(dependent_task_exe.id)
        
        workflow_completed,msg = self.is_all_tasks_exections_completed(workflow_execution_id)  
              
        if workflow_completed:
            workflow_exe.mark_as_completed()
        elif msg=='task_failed':
            workflow_exe.mark_as_failed()
        
            
        
            
                
        