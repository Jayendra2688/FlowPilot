// WorkflowDetailsForm.jsx - Presentational Component
// Receives data and callbacks via props, renders UI

function WorkflowDetailsForm({ formData, onInputChange, onTriggerConfigChange }) {
  return (
    <div className="max-w-2xl mx-auto mt-8">
      {/* Workflow Name */}
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Workflow Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onInputChange('name', e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="e.g., Patient Onboarding"
        />
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          className="w-full p-2 border rounded"
          rows="3"
          placeholder="What does this workflow do?"
        />
      </div>

      {/* Trigger Type */}
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Trigger Type</label>
        <select
          value={formData.trigger_type}
          onChange={(e) => onInputChange('trigger_type', e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="manual">Manual</option>
          <option value="webhook">Webhook</option>
          <option value="schedule">Schedule</option>
        </select>
      </div>

      {/* Trigger Config: Webhook */}
      {formData.trigger_type === 'webhook' && (
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Webhook URL</label>
          <input
            type="text"
            value={formData.trigger_config.webhook_url || ""}
            onChange={(e) => onTriggerConfigChange('webhook_url', e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="https://api.example.com/webhook"
          />
        </div>
      )}

      {/* Trigger Config: Schedule */}
      {formData.trigger_type === 'schedule' && (
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Cron Expression</label>
          <input
            type="text"
            value={formData.trigger_config.cron_expression || ""}
            onChange={(e) => onTriggerConfigChange('cron_expression', e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="0 0 * * * (every day at midnight)"
          />
        </div>
      )}
    </div>
  );
}

export default WorkflowDetailsForm;
