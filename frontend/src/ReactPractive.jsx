import { useState } from "react";
function Arrow(){
    return <div>-></div>;
}
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
        <div className="min-h-screen bg-gray-100 flex items-center justify-center bg-grid">
        <div className="flex items-center space-x-4">
        {steps.map((step,idx) => (
            <div className="flex items-center space-x-4">
                <div key={step.step_id} onClick={() => handleClick(step.step_id)}
                    className={`px-4 py-2 mx-2 my-2 rounded font-semibold ${
                    step.active ? "bg-green-400 text-white" : "bg-gray-300 text-black"
                    }`}>
                    <p>{step.step_id}.</p>
                    <p>{step.step_name}</p>
                </div>
                {idx!=steps.length-1 && <Arrow/>}
            </div>
        ))}
        </div>
        </div>
    )
}
export default DisplaySteps;