"""
CORS Middleware module.

Handles Cross-Origin Resource Sharing configuration for the FastAPI application.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Adds CORS middleware to the FastAPI app to accept requests from different origins
def add_cors_middleware(app: FastAPI):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",  # For local development
            "https://learning-swap-front-end-seven.vercel.app"  # Your frontend domain
        ], 
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
