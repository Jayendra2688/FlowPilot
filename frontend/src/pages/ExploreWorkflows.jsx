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
        <div className='page-style flex flex-col'>
        <h1 className='main-header text-5xl'>Workflows</h1>
            <div className="flex flex-col">
            {worlfows.map((workflow,index)=>(
                <div className="btn-primary hover:scale-105" key={index+1} onClick={()=> handleClick(workflow.id)}>
                    {index+1}.{workflow.name} {"v{" + workflow.version + "}"}
                </div>
            ))}
        </div>
        </div>
    )
}

export default ExploreWorkflows;

