#!/bin/sh
# Health check script for Docker container
# منصة اختبار الاختراق والأمن الهجومي

set -e

# Check if the application is responding
if wget --no-verbose --tries=1 --spider http://localhost:3000/health 2>&1 | grep -q '200 OK'; then
    exit 0
else
    exit 1
fi
