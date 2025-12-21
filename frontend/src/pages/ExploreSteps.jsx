import { Route,useNavigate,Router } from "react-router-dom";
import { useState,useEffect } from 'react';
import { useParams } from "react-router-dom";
function Step({step}){
    return (
    <div className={`btn-primary`}>
        {step.step_type.replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase())
        }
    </div>
    )
}
function getStepColor(step){
    if(step.state=='pending'){
        return "bg-grey-500 hover:bg-grey-400";
    }else if(step.state=='running'){
        return "bg-blue-500 hover:bg-blue-400";
    }else if(step.state=='completed'){
        return "bg-green-500 hover:bg-green-400";
    }else
        return "bg-red-500 hover:bg-red-400";
}


function Execute({workflow_id,setWorkflowExeId,setStepExeMap}){
    async function handleClink(workflow_id) {
        try{
            const res = await fetch(`http://127.0.0.1:8001/api/execute-workflow/${workflow_id}/`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                workflow_id: workflow_id,
                            }),
                        });
            if(!res.ok){
                throw new Error(`Request failed Error HTTP${res.status}`);
            }
            const body = await res.json();
            setWorkflowExeId(body["result"]["workflow"]);
            setStepExeMap(body["result"]["steps"]);
        }catch (error){
            console.error("failed:",error);
        }
    }
    return (
        <div className="btn-primary bg-blue-500 hover:bg-blue-400" onClick={() => handleClink(workflow_id)}>
            Execute
        </div>
    )
}
export default function ExploreSteps(){
    const {workflow_id} = useParams();
    console.log("workflow_id is ",workflow_id);

    const [data,setData] = useState(null);
    const [worflowExeId,setWorkflowExeId] = useState(null);
    const [workflowState,setWorkflowState] = useState(null);
    const [stepExeMap,setStepExeMap] = useState({});
    const [stepStatusMap,setStepStatusMap] = useState({});

    
    useEffect(function(){
        if(!worflowExeId) return;
        async function pollWorflow() {
            try{
                const workflow_exe_id = worflowExeId;
                const res = await fetch(`http://127.0.0.1:8001/api/get-state/workflow/${workflow_exe_id}`);
                if(!res.ok){
                    throw new Error(`HTTP ${res.status}`);
                }
                const body = await res.json();
                // console.log("workflow_status",body["entity_status"]);
                setWorkflowState(body["entity_status"]);
            }catch(err){
                console.log("Error ",err);
            }
        }
        pollWorflow();
        const id = setInterval(pollWorflow,11500);

        return ()=>{
            clearInterval(id);
        }
    },[worflowExeId]);

    useEffect(function(){
        if (!stepExeMap || Object.keys(stepExeMap).length === 0) return;


        async function pollSteps(){
            try{
                const results = await Promise.all(
                    Object.entries(stepExeMap).map(
                        async ([stepId,taskExeId]) => {
                            console.log("HI");
                            const res = await fetch(`http://127.0.0.1:8001/api/get-state/step/${taskExeId}`);
                            if(!res.ok){
                                throw new Error(`HTTP ${res.status}`);
                            }
                            const body = await res.json();
                            
                            const result = {stepId:stepId,stepState:body["entity_status"]};
                            return result;
                        }
                    )
                );

                setStepStatusMap((prev) => {
                    const next = {...prev};
                    results.forEach(({stepId,stepState}) => {
                        next[stepId] = stepState;
                    })
                    return next;
                });
            }catch(error){
                console.log("Error ",error);
            }

        };

        pollSteps();

        const id = setInterval(pollSteps,12250);
        return ()=>{
            clearInterval(id);
        };

    },[stepExeMap]);
    useEffect(() => {
  console.log("stepStatusMap updated:", stepStatusMap);
}, [stepStatusMap]);

    useEffect(function(){

        async function fetchStep() {
            try{
                const res = await fetch(`http://127.0.0.1:8001/api/steps/?id=${workflow_id}`);
                if(!res.ok) throw Error(`HTTP ${res.status}`);
                const body = await res.json();
                setData(body);
            }catch(err){
                console.log("Error: ",err);
            }
            
        }
        fetchStep();
    },[workflow_id]);

    return (
        <div className="page-style flex-col gap-5">
            <h2 className="main-header text-4xl">Steps</h2>
            <div className="flex gap-10">
                {data && data.map(level => (
                    <div key={level.id} className="flex flex-col">
                        {level.steps.map(step => (
                            <Step key={step.id} step={step} state={step.state}/>
                        ))}
                    </div>
                    
                ))}
            </div>
            <Execute workflow_id={workflow_id} setWorkflowExeId = {setWorkflowExeId} setStepExeMap = {setStepExeMap}/>
        </div>
    )

}
