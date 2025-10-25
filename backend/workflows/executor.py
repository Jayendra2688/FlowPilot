def send_sms(config):
    message = config.get("message")
    print(f"📩 Sending SMS: {message}")
    # TODO: integrate Twilio/WhatsApp later


def create_invoice(config):
    amount = config.get("amount")
    print(f"💰 Creating invoice for amount: {amount}")
    # TODO: integrate Razorpay/Stripe later


# Main workflow executor
def execute_workflow(workflow_json):
    steps = workflow_json.get("steps", [])
    for step in steps:
        step_type = step.get("type")
        config = step.get("config", {})

        if step_type == "send_sms":
            send_sms(config)
        elif step_type == "create_invoice":
            create_invoice(config)
        else:
            print(f"⚠️ Unknown step type: {step_type}")
