import { useState } from "react";

function DisplaySteps(){
    const [steps,setSteps] = useState([
        {"step_id":1,"step_name":"Hello","active":true},
        {"step_id":2,"step_name":"Hi","active":true},
        {"step_id":3,"step_name":"How are you?","active":true},
    ])
    function handleClick(id){
        const newSteps = steps.map(step => 
        {
           if(id===step.step_id){
            return {...step,active:!step.active};
           }else{
            return step;
           }
        }
        )
        setSteps(newSteps);
    }
    return (
        <>
        {steps.map(step => (
            <div>
                <button key={step.step_id} onClick={() => handleClick(step.step_id)}
                    className={`px-4 py-2 rounded font-semibold ${
                    step.active ? "bg-green-500 text-white" : "bg-gray-300 text-black"
                    }`}>
                {step.step_name} {step.active ? "True" : "False"}
                </button>
            </div>
        ))}
        </>
    )
}
export default DisplaySteps;