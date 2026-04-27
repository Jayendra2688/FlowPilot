import { useState, useEffect } from 'react';
import WorkflowDetailsForm from '../components/workflow/WorkflowDetailsForm';

// Pure UI concern — how to render config fields for each step type
// label + output_schema come from backend via /api/step-types/
const STEP_FIELDS = {
    http_request: [
        { key: 'url',    label: 'URL',    type: 'text',     placeholder: 'https://api.example.com/data', required: true },
        { key: 'method', label: 'Method', type: 'select',   options: ['GET', 'POST', 'PUT', 'DELETE'],   required: true },
        { key: 'body',   label: 'Body',   type: 'textarea', placeholder: '{"key": "value"}',             required: false },
    ],
    send_email: [
        { key: 'to',      label: 'To',      type: 'text',     placeholder: 'user@example.com', required: true },
        { key: 'subject', label: 'Subject', type: 'text',     placeholder: 'Hello!',           required: true },
        { key: 'body',    label: 'Body',    type: 'textarea', placeholder: 'Email content...', required: true },
    ],
    delay: [
        { key: 'seconds', label: 'Seconds', type: 'number', placeholder: '5', required: true },
    ],
};

const LEVEL2_SUGGESTIONS = ['data', 'name', 'id'];

// ─── Variable Picker ───────────────────────────────────────────────────────────
function VariablePicker({ steps, stepTypes, onInsert }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState(null);
    const [currentPath, setCurrentPath] = useState('');
    const [customKey, setCustomKey] = useState('');

    const preview = selectedStep
        ? `{{step_${selectedStep.step_id}.${currentPath}}}`.replace(/\.$/, '')
        : '';

    const level1Fields = selectedStep
        ? (stepTypes[selectedStep.step_type]?.output_schema || [])
        : [];

    const isLevel1Done = currentPath !== '';

    function handleStepClick(step) {
        setSelectedStep(step);
        setCurrentPath('');
        setCustomKey('');
    }

    function handleFieldClick(field) {
        setCurrentPath(currentPath ? `${currentPath}.${field}` : field);
        setCustomKey('');
    }

    function handleCustomKeyInsert() {
        if (!customKey.trim()) return;
        handleFieldClick(customKey.trim());
        setCustomKey('');
    }

    function handleInsert() {
        if (!preview) return;
        onInsert(preview);
        // reset
        setIsOpen(false);
        setSelectedStep(null);
        setCurrentPath('');
        setCustomKey('');
    }

    return (
        <div className="relative inline-block">
            {/* + button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 cursor-pointer"
            >
                + var
            </button>

            {isOpen && (
                <div className="absolute z-10 mt-1 right-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3">

                    {/* Step selection */}
                    <p className="text-xs text-gray-500 mb-2 font-medium">Pick a step:</p>
                    {steps.length === 0 && (
                        <p className="text-xs text-gray-400">No previous steps available</p>
                    )}
                    {steps.map(step => (
                        <div
                            key={step.step_id}
                            onClick={() => handleStepClick(step)}
                            className={`text-sm p-2 rounded cursor-pointer mb-1 ${
                                selectedStep?.step_id === step.step_id
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'hover:bg-gray-50'
                            }`}
                        >
                            Step {step.step_id}{step.name ? ` - ${step.name}` : ''}
                        </div>
                    ))}

                    {/* Field selection — level 1 */}
                    {selectedStep && (
                        <>
                            <hr className="my-2" />
                            <p className="text-xs text-gray-500 mb-2 font-medium">Pick a field:</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {level1Fields.map(field => (
                                    <button
                                        key={field}
                                        type="button"
                                        onClick={() => setCurrentPath(field)}
                                        className={`text-xs px-2 py-1 rounded border cursor-pointer ${
                                            currentPath.startsWith(field)
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                                        }`}
                                    >
                                        {field}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Go deeper — level 2+ */}
                    {isLevel1Done && (
                        <>
                            <p className="text-xs text-gray-500 mb-2 font-medium">Go deeper (optional):</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {LEVEL2_SUGGESTIONS.map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => handleFieldClick(s)}
                                        className="text-xs px-2 py-1 rounded border bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 cursor-pointer"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-1 mb-2">
                                <input
                                    type="text"
                                    value={customKey}
                                    onChange={e => setCustomKey(e.target.value)}
                                    placeholder="type custom key..."
                                    className="flex-1 text-xs p-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                    onKeyDown={e => e.key === 'Enter' && handleCustomKeyInsert()}
                                />
                                <button
                                    type="button"
                                    onClick={handleCustomKeyInsert}
                                    className="text-xs px-2 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 cursor-pointer"
                                >
                                    +
                                </button>
                            </div>
                        </>
                    )}

                    {/* Preview + Insert */}
                    {preview && currentPath && (
                        <>
                            <hr className="my-2" />
                            <p className="text-xs text-gray-400 mb-1">Preview:</p>
                            <p className="text-xs font-mono bg-gray-50 p-1 rounded mb-2 break-all">{preview}</p>
                            <button
                                type="button"
                                onClick={handleInsert}
                                className="w-full text-sm py-1 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                            >
                                Insert
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Generic config fields renderer ───────────────────────────────────────────
function StepConfigFields({ stepData, availableSteps, stepTypes, onConfigChange }) {
    const fields = STEP_FIELDS[stepData.step_type];
    if (!fields || fields.length === 0) return null;

    // depends_on steps only — guaranteed completed at runtime
    const dependsOnSteps = availableSteps.filter(s => stepData.depends_on.includes(s.step_id));

    return (
        <div className="mt-2">
            {fields.map(field => (
                <div key={field.key} className="mb-4">
                    <label className="block mb-1 font-medium text-sm text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {field.type === 'text' && (
                        <div className="flex items-center">
                            <input
                                type="text"
                                value={stepData.config[field.key] || ''}
                                onChange={(e) => onConfigChange(field.key, e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                placeholder={field.placeholder}
                            />
                            <VariablePicker
                                steps={dependsOnSteps}
                                stepTypes={stepTypes}
                                onInsert={(val) => onConfigChange(field.key, (stepData.config[field.key] || '') + val)}
                            />
                        </div>
                    )}
                    {field.type === 'number' && (
                        <input
                            type="number"
                            value={stepData.config[field.key] || ''}
                            onChange={(e) => onConfigChange(field.key, Number(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            placeholder={field.placeholder}
                            min="1"
                        />
                    )}
                    {field.type === 'textarea' && (
                        <div>
                            <div className="flex justify-end mb-1">
                                <VariablePicker
                                    steps={dependsOnSteps}
                                    stepTypes={stepTypes}
                                    onInsert={(val) => onConfigChange(field.key, (stepData.config[field.key] || '') + val)}
                                />
                            </div>
                            <textarea
                                value={stepData.config[field.key] || ''}
                                onChange={(e) => onConfigChange(field.key, e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                rows="3"
                                placeholder={field.placeholder}
                            />
                        </div>
                    )}
                    {field.type === 'select' && (
                        <select
                            value={stepData.config[field.key] || ''}
                            onChange={(e) => onConfigChange(field.key, e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Select...</option>
                            {field.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    )}
                </div>
            ))}
        </div>
    );
}


// ─── Single step card ──────────────────────────────────────────────────────────
function StepConfigure({ stepData, availableSteps, stepTypes, onInputChange, expandStepData, handleExpandSteps, stepErrors }) {
    const step_id = stepData.step_id;
    const isExpanded = expandStepData[step_id];

    const handleConfigChange = (fieldKey, value) => {
        onInputChange(step_id, 'config', { ...stepData.config, [fieldKey]: value });
    };

    const handleStepTypeChange = (newType) => {
        onInputChange(step_id, 'config', {});
        onInputChange(step_id, 'step_type', newType);
    };

    // label from backend, fallback to key if not loaded yet
    const stepLabel = stepTypes[stepData.step_type]?.label || stepData.step_type;

    return (
        <div className="max-w-2xl mx-auto mt-4">
            <div
                onClick={() => handleExpandSteps(step_id)}
                className="flex justify-between items-center p-4 mb-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200"
            >
                <div>
                    <h1 className="font-semibold">Step {step_id}</h1>
                    {stepData.name && <p className="text-sm text-gray-500">{stepData.name}</p>}
                </div>
                <div className="flex items-center gap-3">
                    {stepData.step_type && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {stepLabel}
                        </span>
                    )}
                    <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
                </div>
            </div>

            {isExpanded && (
                <div className="border border-gray-200 rounded p-4 mb-2">
                    {/* Step Name */}
                    <div className="mb-4">
                        <label className="block mb-1 font-medium text-sm text-gray-700">
                            Step Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={stepData.name}
                            onChange={(e) => onInputChange(step_id, 'name', e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            placeholder="e.g., Fetch Todo"
                        />
                        {stepErrors?.name && <p className="text-red-500 text-sm mt-1">{stepErrors.name}</p>}
                    </div>

                    {/* Step Type — options come from backend */}
                    <div className="mb-4">
                        <label className="block mb-1 font-medium text-sm text-gray-700">
                            Step Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={stepData.step_type}
                            onChange={(e) => handleStepTypeChange(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Select a step type...</option>
                            {Object.entries(stepTypes).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                        {stepErrors?.step_type && <p className="text-red-500 text-sm mt-1">{stepErrors.step_type}</p>}
                    </div>

                    {/* Config fields */}
                    {stepData.step_type && (
                        <StepConfigFields
                            stepData={stepData}
                            availableSteps={availableSteps}
                            stepTypes={stepTypes}
                            onConfigChange={handleConfigChange}
                        />
                    )}

                    {/* Depends On */}
                    {availableSteps.length > 0 && (
                        <div className="mb-4">
                            <label className="block mb-2 font-medium text-sm text-gray-700">Depends On</label>
                            {availableSteps.map(step => (
                                <label key={step.step_id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={stepData.depends_on.includes(step.step_id)}
                                        onChange={(e) => {
                                            const newDepends = e.target.checked
                                                ? [...stepData.depends_on, step.step_id]
                                                : stepData.depends_on.filter(id => id !== step.step_id);
                                            onInputChange(step_id, 'depends_on', newDepends);
                                        }}
                                    />
                                    <span className="text-sm">
                                        Step {step.step_id}{step.name ? ` - ${step.name}` : ''}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function getAvailableSteps(formData, step_id) {
    return formData.steps.filter(step => step.step_id < step_id);
}

function WorkflowSteps({ formData, stepTypes, onInputChange, expandStepData, handleExpandSteps, errors }) {
    return (
        <>
            {formData.steps.map((step) => (
                <StepConfigure
                    key={step.step_id}
                    stepData={step}
                    availableSteps={getAvailableSteps(formData, step.step_id)}
                    stepTypes={stepTypes}
                    onInputChange={onInputChange}
                    expandStepData={expandStepData}
                    handleExpandSteps={handleExpandSteps}
                    stepErrors={errors.steps[step.step_id]}
                />
            ))}
        </>
    );
}

function WorkflowSummary({ formData, stepTypes }) {
    return (
        <div className="max-w-2xl mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-6">Review & Submit</h2>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-6">
                <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Workflow Details</h3>
                <div className="grid grid-cols-3 gap-y-3">
                    <p className="text-gray-500 font-medium">Name</p>
                    <p className="col-span-2">{formData.name}</p>

                    <p className="text-gray-500 font-medium">Description</p>
                    <p className="col-span-2">{formData.description}</p>

                    <p className="text-gray-500 font-medium">Trigger</p>
                    <p className="col-span-2">{formData.trigger_type}</p>

                    {formData.trigger_type !== 'manual' && (
                        <>
                            <p className="text-gray-500 font-medium">Trigger Config</p>
                            <p className="col-span-2">
                                {formData.trigger_config.webhook_url || formData.trigger_config.cron_expression}
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 pb-2 border-b">Steps ({formData.steps.length})</h3>
                {formData.steps.map(step => (
                    <div key={step.step_id} className="mb-4 p-4 bg-gray-50 rounded border border-gray-100">
                        <p className="font-semibold mb-2">Step {step.step_id} - {step.name}</p>
                        <div className="grid grid-cols-3 gap-y-2 text-sm">
                            <p className="text-gray-500">Type</p>
                            <p className="col-span-2">{stepTypes[step.step_type]?.label || step.step_type}</p>

                            <p className="text-gray-500">Config</p>
                            <p className="col-span-2 font-mono text-xs">{JSON.stringify(step.config)}</p>

                            <p className="text-gray-500">Depends On</p>
                            <p className="col-span-2">
                                {step.depends_on.length > 0
                                    ? step.depends_on.map(id => `Step ${id}`).join(', ')
                                    : 'None'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
function CreateWorkflow() {
    const [stepTypes, setStepTypes] = useState({});  // fetched from backend

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        trigger_type: 'manual',
        trigger_config: {},
        steps: [{ step_id: 1, name: '', step_type: '', step_order: 1, config: {}, depends_on: [] }],
    });

    const [errors, setErrors] = useState({
        name: '', description: '', trigger_type: '',
        steps: { 1: { name: '', step_type: '' } },
    });

    const [expandSteps, setExpandSteps] = useState({ 1: true });
    const [currentStep, setCurrentStep] = useState(1);
    const [submitStatus, setSubmitStatus] = useState(null);

    // Fetch step types from backend once on mount
    useEffect(() => {
        fetch('http://127.0.0.1:8001/api/step-types/')
            .then(res => res.json())
            .then(data => setStepTypes(data))
            .catch(err => console.error('Failed to load step types:', err));
    }, []);

    const handleInputChange = (fieldName, value) => {
        if (errors[fieldName]) setErrors({ ...errors, [fieldName]: '' });
        if (fieldName === 'trigger_type') {
            let newconfig = {};
            if (value === 'webhook') newconfig = { webhook_url: '' };
            else if (value === 'schedule') newconfig = { cron_expression: '' };
            setFormData({ ...formData, [fieldName]: value, trigger_config: newconfig });
        } else {
            setFormData({ ...formData, [fieldName]: value });
        }
    };

    const handleTriggerConfig = (fieldName, value) => {
        setFormData({ ...formData, trigger_config: { ...formData.trigger_config, [fieldName]: value } });
    };

    const handleStepConfig = (step_id, fieldName, value) => {
        if (errors.steps[step_id]?.[fieldName]) {
            setErrors({ ...errors, steps: { ...errors.steps, [step_id]: { ...errors.steps[step_id], [fieldName]: '' } } });
        }
        setFormData({
            ...formData,
            steps: formData.steps.map(step =>
                step.step_id === step_id ? { ...step, [fieldName]: value } : step
            )
        });
    };

    const handleAddStep = () => {
        const new_step_id = formData.steps.length + 1;
        setFormData({
            ...formData,
            steps: [...formData.steps, { step_id: new_step_id, name: '', step_type: '', step_order: new_step_id, config: {}, depends_on: [] }]
        });
        setExpandSteps({ ...expandSteps, [new_step_id]: true });
        setErrors({ ...errors, steps: { ...errors.steps, [new_step_id]: { name: '', step_type: '' } } });
    };

    const handleExpandSteps = (step_id) => {
        setExpandSteps({ ...expandSteps, [step_id]: !expandSteps[step_id] });
    };

    const handleNext = () => {
        if (currentStep === 1) { if (validateStep1()) setCurrentStep(2); }
        else if (currentStep === 2) { if (validateStep2()) setCurrentStep(3); }
    };

    const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

    function validateStep1() {
        const newErrors = { ...errors };
        const nameOk = formData.name.trim() !== '';
        const descOk = formData.description.trim() !== '';
        newErrors.name = nameOk ? '' : 'Name is required';
        newErrors.description = descOk ? '' : 'Description is required';
        setErrors(newErrors);
        return nameOk && descOk;
    }

    function validateStep2() {
        let newErrors = { ...errors };
        let isValid = true;
        formData.steps.forEach(step => {
            const sid = step.step_id;
            const stepErrors = { name: '', step_type: '' };
            let stepValid = true;
            if (step.name.trim() === '') { stepErrors.name = 'Name is required'; stepValid = false; }
            if (step.step_type === '') { stepErrors.step_type = 'Step type is required'; stepValid = false; }
            newErrors.steps = { ...newErrors.steps, [sid]: stepErrors };
            if (!stepValid) { setExpandSteps(prev => ({ ...prev, [sid]: true })); isValid = false; }
        });
        setErrors(newErrors);
        return isValid;
    }

    async function handleSubmit() {
        setSubmitStatus('loading');
        try {
            const response = await fetch('http://127.0.0.1:8001/api/workflows/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!response.ok) throw new Error('Failed to create workflow');
            await response.json();
            setSubmitStatus('success');
        } catch (error) {
            console.error('Error:', error);
            setSubmitStatus('error');
        }
    }

    return (
        <div className="page-style flex flex-col">
            <h1 className="main-header text-5xl">Create Workflow</h1>

            {/* Progress indicator */}
            <div className="flex items-center gap-2 max-w-2xl mx-auto mt-4 w-full">
                {['Workflow Details', 'Configure Steps', 'Review'].map((label, i) => (
                    <div key={i} className="flex items-center gap-2 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold
                            ${currentStep > i + 1 ? 'bg-green-500 text-white' :
                              currentStep === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {currentStep > i + 1 ? '✓' : i + 1}
                        </div>
                        <span className={`text-sm ${currentStep === i + 1 ? 'font-semibold' : 'text-gray-400'}`}>{label}</span>
                        {i < 2 && <div className="flex-1 h-px bg-gray-200 ml-2" />}
                    </div>
                ))}
            </div>

            {currentStep === 1 && (
                <WorkflowDetailsForm
                    formData={formData}
                    onInputChange={handleInputChange}
                    onTriggerConfigChange={handleTriggerConfig}
                    errors={errors}
                />
            )}
            {currentStep === 2 && (
                <WorkflowSteps
                    formData={formData}
                    stepTypes={stepTypes}
                    onInputChange={handleStepConfig}
                    expandStepData={expandSteps}
                    handleExpandSteps={handleExpandSteps}
                    errors={errors}
                />
            )}
            {currentStep === 3 && <WorkflowSummary formData={formData} stepTypes={stepTypes} />}

            {currentStep === 2 && (
                <div className="max-w-2xl mx-auto w-full mt-2">
                    <button
                        onClick={handleAddStep}
                        className="w-full p-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-400 hover:text-blue-500 cursor-pointer"
                    >
                        + Add Step
                    </button>
                </div>
            )}

            <div className="flex gap-4 max-w-2xl mx-auto mt-6 w-full">
                {currentStep !== 1 && (
                    <button onClick={handleBack} className="btn-primary bg-gray-500 hover:bg-gray-400 flex items-center gap-1">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 6L9 12L15 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Back
                    </button>
                )}
                {currentStep !== 3 && (
                    <button onClick={handleNext} className="btn-primary bg-blue-500 hover:bg-blue-400 flex items-center gap-1">
                        Next
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                )}
                {currentStep === 3 && (
                    <button
                        onClick={handleSubmit}
                        disabled={submitStatus === 'loading' || submitStatus === 'success'}
                        className="btn-primary bg-green-500 hover:bg-green-400 disabled:opacity-50"
                    >
                        {submitStatus === 'loading' ? 'Submitting...' : submitStatus === 'success' ? 'Created!' : 'Submit'}
                    </button>
                )}
            </div>

            {submitStatus === 'success' && (
                <div className="max-w-2xl mx-auto mt-4 p-3 bg-green-50 border border-green-300 rounded text-green-700">
                    Workflow created successfully!
                </div>
            )}
            {submitStatus === 'error' && (
                <div className="max-w-2xl mx-auto mt-4 p-3 bg-red-50 border border-red-300 rounded text-red-700">
                    Failed to create workflow. Please try again.
                </div>
            )}
        </div>
    );
}

export default CreateWorkflow;
