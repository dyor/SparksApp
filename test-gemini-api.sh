#!/bin/bash

# Test Gemini API with curl
# Replace YOUR_API_KEY with your actual API key

YOUR_API_KEY="AIzaSyB7ZpoJDL4ng3AmRyaMFw5NkdCf2n5zPP4"

# Simple test prompt
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=$YOUR_API_KEY" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "contents": [{
        "parts": [{
          "text": "Hello Gemini 3! What are your standout features?"
        }]
      }]
    }'
echo ""




