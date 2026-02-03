import { useState } from 'react';
import WorkflowDetailsForm from '../components/workflow/WorkflowDetailsForm';

function StepConfigure({stepData,id,onInputChange}){
     
    return (<>
         <div className="max-w-2xl mx-auto mt-8" id={id}>
            <h1>Step {stepData.step_id}</h1>
            {/* Step Name */}
            <div className="mb-4">
                <label className="block mb-2 font-semibold">Step Name</label>
                <input
                type="text"
                value={stepData.name}
                onChange={(e) => onInputChange(id,'name', e.target.value)}
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
                onChange={(e) => onInputChange(id,'type', e.target.value)}
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
                onChange={(e) => onInputChange(id,'order', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., 3"
                />
            </div>

            {/* Step Config */}
            <div className="mb-4">
                <label className="block mb-2 font-semibold">Step Config</label>
                <textarea
                value={stepData.config}
                onChange={(e) => onInputChange(id,'config', e.target.value)}
                className="w-full p-2 border rounded"
                rows="3"
                placeholder="{'phone':'+91899229310','sms':'+91982891021'}"
                />
            </div>

            {/* Depends on */}
            <div className="mb-4">
                <label className="block mb-2 font-semibold">Step Depends On:</label>
                <input
                value={stepData.depends}
                onChange={(e) => onInputChange(id,'depends', e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Eg: 1,3s"
                />
            </div>
         </div>

    </>);
}

function AddStep({handleClick}){
    <button onClick={() => handleClick()}>Add Step</button>
}
function WorkflowSteps({ formData,onInputChange}){
    console.log("hrlloo");
    return (<>
        {formData.steps.map((step,id) => (
            <StepConfigure stepData={step} id={id+1} onInputChange={onInputChange}/>
        ))}
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
            depends:""
        },
    ],
});

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
    const emptyStep = {
        step_id:formData.steps.length +1,
        name: "",
        type: "",
        order: "",
        config: "",
        depends: ""
    };
    setFormData({
        ...formData,
        steps:[
            ...formData.steps,
            emptyStep
        ]
    })
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
         <WorkflowSteps formData={formData} onInputChange={handleStepConfig}/>
        </>)}



        <button onClick={handleNext}>Next</button>

        <button onClick={handleAddStep}>Add Step</button>

        {/* Debug: Show current state */}
        <div className="mt-8 p-4 bg-gray-100 rounded max-w-2xl mx-auto">
          <p className="font-bold mb-2">Current State (for learning):</p>
          <pre>{JSON.stringify(formData, null, 3)}</pre>
        </div>
      </div>
);
}

export default CreateWorkflow;