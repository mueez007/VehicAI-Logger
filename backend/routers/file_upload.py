from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import io
import json
from typing import List, Dict, Any
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/process-file")
async def process_file(file: UploadFile = File(...)):
    """
    Process uploaded files (Excel, CSV, PDF) and convert to text format for the agent
    """
    try:
        # Read file content
        contents = await file.read()
        
        if file.content_type in ['application/vnd.ms-excel', 
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']:
            # Process Excel files
            result = await process_excel_file(contents, file.filename)
        elif file.content_type == 'text/csv':
            # Process CSV files
            result = await process_csv_file(contents, file.filename)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload Excel or CSV files.")

        return JSONResponse(content=result)

    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

async def process_excel_file(contents: bytes, filename: str) -> Dict[str, Any]:
    """Process Excel file and convert to structured text"""
    try:
        # Read Excel file
        df = pd.read_excel(io.BytesIO(contents))
        
        # Convert to structured text
        text_content = convert_dataframe_to_text(df, filename)
        
        return {
            "success": True,
            "filename": filename,
            "content": text_content,
            "record_count": len(df),
            "columns": list(df.columns),
            "message": f"Excel file processed successfully. Found {len(df)} records."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(e)}")

async def process_csv_file(contents: bytes, filename: str) -> Dict[str, Any]:
    """Process CSV file and convert to structured text"""
    try:
        # Read CSV file
        df = pd.read_csv(io.BytesIO(contents))
        
        # Convert to structured text
        text_content = convert_dataframe_to_text(df, filename)
        
        return {
            "success": True,
            "filename": filename,
            "content": text_content,
            "record_count": len(df),
            "columns": list(df.columns),
            "message": f"CSV file processed successfully. Found {len(df)} records."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV file: {str(e)}")

def convert_dataframe_to_text(df: pd.DataFrame, filename: str) -> str:
    """Convert DataFrame to structured text format for the agent"""
    
    text_parts = []
    text_parts.append(f"FILE: {filename}")
    text_parts.append(f"TOTAL RECORDS: {len(df)}")
    text_parts.append(f"COLUMNS: {', '.join(df.columns)}")
    text_parts.append("")
    text_parts.append("DATA:")
    text_parts.append("=" * 50)
    
    # Add sample records (first 5)
    for i, (_, row) in enumerate(df.head().iterrows()):
        text_parts.append(f"Record {i + 1}:")
        for col in df.columns:
            text_parts.append(f"  {col}: {row[col]}")
        text_parts.append("")
    
    if len(df) > 5:
        text_parts.append(f"... and {len(df) - 5} more records")
    
    return "\n".join(text_parts)