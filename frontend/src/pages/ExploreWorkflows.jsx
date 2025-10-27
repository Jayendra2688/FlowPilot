import { Route,Routes,useNavigate } from 'react-router-dom'
import { useState,useEffect } from 'react';

function ExploreWorkflows(){   
    const navigate = useNavigate();
    const [worlfows,setWorkflow] = useState([{}]);

    async function getWorkflows() {
        try{
            const res = await fetch('http://127.0.0.1:8001/api/workflows/');
            if(!res.ok) throw Error(`HTTP ${res.status}`);
            const body = await res.json();
            console.log(body);
            setWorkflow(body);
        }catch (error){
            console.error("failed:",error);
        }  
    }
    useEffect(function(){
        getWorkflows();
    },[])
    async function handleClick(id) {
        navigate(`/steps/${id}`);
    }

    return (
        <div className="explore-workflow-content">
            <h1>Workflows</h1>
            {worlfows.map((workflow,index)=>(
                <button className="view-workflow" key={index+1} onClick={()=> handleClick(workflow.id)}>
                    {index+1}.{workflow.description} (v{workflow.version})
                </button>
            ))}
        </div>
    )
}

export default ExploreWorkflows;

