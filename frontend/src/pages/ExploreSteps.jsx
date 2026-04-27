import { Route,useNavigate,Router } from "react-router-dom";
import { useState,useEffect } from 'react';
import { useParams } from "react-router-dom";
function Step({step,status}){
    console.log("Status ",status);
    return (
    <div className={`btn-base ${getStepColor(status)}`}>
        {step.step_type.replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase())
        }
    </div>
    )
}
function getStepColor(status){
    if(status=='pending'){
        return "bg-gray-500 hover:bg-gray-400";
    }else if(status=='running'){
        return "bg-blue-500 hover:bg-blue-400";
    }else if(status=='completed'){
        return "bg-green-500 hover:bg-green-400";
    }else
        return "bg-red-500 hover:bg-red-400";
}

function readyToRun(stepStatusMap){
    if(!stepStatusMap) return false;
    if(Object.keys(stepStatusMap).length==0) return true;
    if(Object.values(stepStatusMap).every(status => status==="completed" || status=="failed")) return true;
    return false;

}

function Execute({workflow_id,setworkflowExeId,setStepExeMap,stepStatusMap}){
    
    async function handleClink(workflow_id) {
        // if(!readyToRun(stepStatusMap)){
        //     alert("Not Ready To Run!!");
        //     return;
        // }
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
            setworkflowExeId(body["result"]["workflow"]);
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

function ExecutionHistory({workflow_id,setExeHistory,setDrawerOpen,drawerOpen}){
    async function getHistory(workflow_id) {
        try{
            const res = await fetch(`http://127.0.0.1:8001/api/execution-history/${workflow_id}/`);
            if(!res.ok){
                throw new Error(`Request failed Error HTTP${res.status}`);
            }
            const body = await res.json();
            console.log("exe his");
            console.log(body);
            setExeHistory(body["result"]);
            setDrawerOpen(!drawerOpen);

        }catch(error){
            console.error("failed:",error);
        }
    }
    return (
        <div className="btn-primary bg-blue-500 hover:bg-blue-400" onClick={() => getHistory(workflow_id)}>
            <span>History</span>
        </div>
    )
}
function HistoryTable({ exeHistory }) {
console.log("exeeehis");
  return (
    <div>
      <table className="table-auto">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {exeHistory?.map((entry, id) => (
            <tr key={id}>
              <td>{id}</td>
              <td>{entry.date_time}</td>
              <td>{entry.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExploreSteps(){
    const {workflow_id} = useParams();
    console.log("workflow_id is ",workflow_id);

    const [data,setData] = useState(null);
    const [workflowExeId,setworkflowExeId] = useState(null);
    const [workflowState,setWorkflowState] = useState(null);
    const [stepExeMap,setStepExeMap] = useState({});
    const [stepStatusMap,setStepStatusMap] = useState(null);
    const [exeHistory,setExeHistory] = useState([]);
    const [drawerOpen,setDrawerOpen] = useState(false);


    
    useEffect(() => {
    if (!workflowExeId) return;

    async function pollWorkflow() {
        try {
            const res = await fetch(
                `/api/get-state/workflow/${workflowExeId}/`
            );

            const body = await res.json();

            setWorkflowState(body.entity_status);
            setStepStatusMap(body.step_status_map);

            if (
                body.entity_status === "completed" ||
                body.entity_status === "failed"
            ) {
                clearInterval(intervalId);
            }

        } catch (err) {
            console.log(err);
        }
    }

    pollWorkflow();

    const intervalId = setInterval(pollWorkflow, 3000);

    return () => clearInterval(intervalId);

}, [workflowExeId]);
function allStepsFinished(stepStatusMap) {
    if (!stepStatusMap) return false;

    return Object.values(stepStatusMap).every(
        status => status === "completed" || status === "failed"
    );
}
useEffect(function () {
    if (!stepExeMap || Object.keys(stepExeMap).length === 0) return;

    let id;

    async function pollSteps() {
        try {
            const results = await Promise.all(
                Object.entries(stepExeMap).map(async ([stepId, taskExeId]) => {

                    const res = await fetch(`http://127.0.0.1:8001/api/get-state/step/${taskExeId}/`);
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}`);
                    }

                    const body = await res.json();
                    return { stepId, stepState: body.entity_status };
                })
            );

            setStepStatusMap(prev => {
                const next = { ...(prev || {}) };

                results.forEach(({ stepId, stepState }) => {
                    next[stepId] = stepState;
                });

                // stop polling if all finished
                if (allStepsFinished(next)) {
                    clearInterval(id);
                }

                return next;
            });

        } catch (error) {
            console.log("Error", error);
        }
    }

    pollSteps();

    id = setInterval(pollSteps, 1000);

    return () => clearInterval(id);

}, [stepExeMap]);

    useEffect(function(){

        async function fetchStep() {
            try{
                const res = await fetch(`http://127.0.0.1:8001/api/steps/?id=${workflow_id}`);
                if(!res.ok) throw Error(`HTTP ${res.status}`);
                const body = await res.json();
                console.log("bod ",body);
                setData(body);
            }catch(err){
                console.log("Error: ",err);
            }
            
        }
        async function fetchLatestExectution() {
            try{
                const res = await fetch(`http://127.0.0.1:8001/api/latest-execution/${workflow_id}/`);
                if(!res.ok) throw Error(`HTTP ${res.status}`);
                const body = await res.json();
                if(body["result"]){
                    setWorkflowState(body["result"]["workflow"]);
                    setStepStatusMap(body["result"]["steps"]);
                }else{
                    setWorkflowState(null);
                    setStepStatusMap({});
                }
            }catch(err){
                console.log("Error: ",err);
            }
            
        }
        fetchStep();
        fetchLatestExectution();
    },[workflow_id]);

    return (
        <div className="flex w-full">
        <div className={`page-style flex-col gap-5 p-10 transition-all duration-500 ${drawerOpen ? "w-3/4" : "w-full" }`}>
            <h2 className="main-header text-4xl">Steps</h2>
            <div className="flex gap-10">
                {data && data.map(level => (
                    <div key={level.id} className="flex flex-col">
                        {level.steps.map(step => (
                            <Step key={step.id} step={step} status={stepStatusMap?.[step.id] ?? "pending"}/>
                        ))}
                    </div>
                    
                ))}
            </div>
            <div className="flex justify-center items-center gap-10 p-5">
                <Execute workflow_id={workflow_id} setworkflowExeId = {setworkflowExeId} setStepExeMap = {setStepExeMap} stepStatusMap = {stepStatusMap}/>
                <ExecutionHistory workflow_id={workflow_id} setExeHistory={setExeHistory} setDrawerOpen={setDrawerOpen} drawerOpen={drawerOpen}/>
            </div>
            {/* Debug: Show current state */}
        <div className="mt-8 p-4 bg-gray-100 rounded max-w-2xl mx-auto">
          <p className="font-bold mb-2">data (for learning):</p>
          <pre>{JSON.stringify(data, null, 3)}</pre>
        </div>
        <div className="mt-8 p-4 bg-gray-100 rounded max-w-2xl mx-auto">
          <p className="font-bold mb-2">workflowExeId (for learning):</p>
          <pre>{JSON.stringify(workflowExeId, null, 3)}</pre>
        </div>
        <div className="mt-8 p-4 bg-gray-100 rounded max-w-2xl mx-auto">
          <p className="font-bold mb-2">workflowState (for learning):</p>
          <pre>{JSON.stringify(workflowState, null, 3)}</pre>
        </div>
        <div className="mt-8 p-4 bg-gray-100 rounded max-w-2xl mx-auto">
          <p className="font-bold mb-2">stepExeMap (for learning):</p>
          <pre>{JSON.stringify(stepExeMap, null, 3)}</pre>
        </div>
        <div className="mt-8 p-4 bg-gray-100 rounded max-w-2xl mx-auto">
          <p className="font-bold mb-2">stepStatusMap (for learning):</p>
          <pre>{JSON.stringify(stepStatusMap, null, 3)}</pre>
        </div>
        </div>
       {<div
            className={`flex justify-center items-center transition-all duration-500 ${drawerOpen ? "w-1/4" : "w-0 hidden" }`}
        > 
            <HistoryTable exeHistory={exeHistory}/>
        </div>}

        
        {/* <div className="mt-8 p-4 bg-gray-100 rounded max-w-2xl mx-auto">
          <p className="font-bold mb-2">stepExeMap (for learning):</p>
          <pre>{JSON.stringify(stepExeMap, null, 3)}</pre>
        </div>
        <div className="mt-8 p-4 bg-gray-100 rounded max-w-2xl mx-auto">
          <p className="font-bold mb-2">stepExeMap (for learning):</p>
          <pre>{JSON.stringify(stepExeMap, null, 3)}</pre>
        </div> */}

        </div>
    )

}
