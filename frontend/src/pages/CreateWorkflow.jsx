import { useState } from 'react';
import WorkflowDetailsForm from '../components/workflow/WorkflowDetailsForm';

function StepConfigure({stepData,availableSteps,onInputChange,expandStepData,handleExpandSteps}){
    let step_id = stepData.step_id;
    let isExpanded = expandStepData[step_id];
    
    return (<>
         <div className="max-w-2xl mx-auto mt-8">
            
            <div onClick={()=>handleExpandSteps(stepData.step_id)} className='flex justify-between items-center p-4 mb-2 bg-gray-300 border border-gray-300 rounded cursor-pointer hover:bg-gray-200'>
                <h1 className='font-semibold'>Step {step_id}</h1>
                 <span className="text-xl">
                    {isExpanded ? "▼" : "▶"}
                </span>
            </div>
            {isExpanded && (<>
            {/* Step Name */}
            <div className="mb-4">
                <label className="block mb-2 font-semibold">Step Name</label>
                <input
                type="text"
                value={stepData.name}
                onChange={(e) => onInputChange(step_id,'name', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., Read Excel Data"
                />
            </div>

            {/* Step Type */}
            <div className="mb-4">
                <label className="block mb-2 font-semibold">Step Type</label>
                <input
                type="text"
                value={stepData.type}
                onChange={(e) => onInputChange(step_id,'type', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., read_excel"
                />
            </div>

            {/* Step Order */}
            <div className="mb-4">
                <label className="block mb-2 font-semibold">Step Order</label>
                <input
                type="text"
                value={stepData.order}
                onChange={(e) => onInputChange(step_id,'order', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., 3"
                />
            </div>

            {/* Step Config */}
            <div className="mb-4">
                <label className="block mb-2 font-semibold">Step Config</label>
                <textarea
                value={stepData.config}
                onChange={(e) => onInputChange(step_id,'config', e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="{'phone':'+91899229310','sms':'+91982891021'}"
                />
            </div>

            {/* Depends on */}
            <div className="mb-4">
                <label className="block mb-2 font-semibold">Step Depends On:</label>
                <select name="" id=""></select>
            </div>
            </>)}
            
         </div>

    </>);
}

function AddStep({handleClick}){
    <button onClick={() => handleClick()}>Add Step</button>
}
function getAvailableSteps(formData,step_id){
    let available_steps = formData.steps.filter(step => step.step_id<step_id).map(step => step.step_id);
    return available_steps;
}
function WorkflowSteps({ formData,onInputChange,expandStepData,handleExpandSteps}){
    return (<>
        {formData.steps.map((step,id) => {
            let available_steps = getAvailableSteps(formData,step.step_id)
            return <StepConfigure key={step.step_id} stepData={step} availableSteps ={available_steps} onInputChange={onInputChange} expandStepData={expandStepData} handleExpandSteps={handleExpandSteps}/>
        })}
    </>);
}
function CreateWorkflow() {
// Initialize form state
const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_type: "manual",
    trigger_config:{},
    steps:[
        {
            step_id:1,
            name:"",
            type:"",
            order:"",
            config:"",
            depends:[]
        },
    ],
});

const [expandSteps,setExpandSteps] = useState({
    1:false
})

const [currentStep,setCurrentStep] = useState(1);



const totalSteps = 3;



// Generic function to update any field
const handleInputChange = (fieldName, value) => {
    if(fieldName==='trigger_type'){
        let newconfig = {};
        if(value==='webhook'){
            newconfig = {"webhook_url":""};
        }else if(value==='schedule'){
            newconfig = {"cron_expression":""};
        }
        setFormData({
            ...formData,
            [fieldName]:value,
            trigger_config:newconfig
        })
    }else{
        setFormData({
        ...formData,        // Keep all existing fields
        [fieldName]: value  // Update the specific field (computed property name)
        });
    }
};

const handleTriggerConfig = (fieldName,value) => {
    let newconfig = {...formData.trigger_config,[fieldName]:value};
    setFormData({
        ...formData,
        trigger_config:newconfig
    });
};

const handleNext = () =>{
    if(currentStep<totalSteps){
        setCurrentStep(currentStep+1);
    }
}

const handleBack = () =>{
    if(currentStep>1){
        setCurrentStep(currentStep-1);
    }
}

const handleStepConfig = (step_id,fieldName,value) =>{
    setFormData({
        ...formData,
        steps:formData.steps.map((step)=>(
            step.step_id === step_id ?
            {...step,[fieldName]:value}
            : step
        ))
    })
}

const handleAddStep = () =>{
    let new_step_id = formData.steps.length +1;
    const emptyStep = {
        step_id:new_step_id,
        name: "",
        type: "",
        order: "",
        config: "",
        depends: []
    };
    setFormData({
        ...formData,
        steps:[
            ...formData.steps,
            emptyStep
        ]
    })
    setExpandSteps({
        ...expandSteps,
        [new_step_id]:false
    })
}

const handleExpandSteps = (step_id) =>{
    setExpandSteps(
        {...expandSteps,
            [step_id] : !expandSteps[step_id]
        }
    );
}


return (
    <div className="page-style flex flex-col">
        <h1 className="main-header text-5xl">Create Workflow</h1>

        <p>{currentStep} step of {totalSteps} steps</p>

        {currentStep==1 && (<>
         <WorkflowDetailsForm 
          formData={formData} 
          onInputChange={handleInputChange}           // ← Match prop name
          onTriggerConfigChange={handleTriggerConfig} // ← Match prop name
        />
        </>)}

        {currentStep==2 && (<>
         <WorkflowSteps formData={formData} onInputChange={handleStepConfig} expandStepData={expandSteps} handleExpandSteps={handleExpandSteps}/>
        </>)}



        <button onClick={handleNext}>Next</button>

        <button onClick={handleAddStep}>Add Step</button>

        {/* Debug: Show current state */}
        <div className="mt-8 p-4 bg-gray-100 rounded max-w-2xl mx-auto">
          <p className="font-bold mb-2">Current State (for learning):</p>
          <pre>{JSON.stringify(formData, null, 3)}</pre>
        </div>
        <div className="mt-8 p-4 bg-gray-100 rounded max-w-2xl mx-auto">
          <p className="font-bold mb-2">Current State (for learning):</p>
          <pre>{JSON.stringify(expandSteps, null, 3)}</pre>
        </div>
      </div>
);
}

export default CreateWorkflow;