#!/bin/bash

# SSO Backend Startup Script
# This script starts the backend service with the correct environment variables

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Start the backend with hot reload
bun --hot index.ts
