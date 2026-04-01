@echo off
stripe listen --forward-to localhost:8000/api/v1/payments/stripe/webhook
pause