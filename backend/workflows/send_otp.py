import random
import time
from twilio.rest import Client
import os
ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOEKN")

client = Client(ACCOUNT_SID, AUTH_TOKEN)
OTP_STORE = {}
def send_otp(phone):
    otp = random.randint(100000, 999999)

    OTP_STORE[phone] = {
        "otp": str(otp),
        "expires_at": time.time() + 300  # 5 min
    }

    client.messages.create(
        from_="whatsapp:+14155238886",
        to=f"whatsapp:+91{phone}",
        body=f"Your OTP is {otp}"
    )
