import io
import csv
from typing import AsyncGenerator, List, Any
from fastapi.responses import StreamingResponse
from app.core.timezone import format_pkt

def stream_csv_response(rows_generator: AsyncGenerator[List[Any], None], filename: str) -> StreamingResponse:
    """
    Stream rows as CSV response using FastAPI StreamingResponse.
    """
    async def csv_stream():
        output = io.StringIO()
        writer = csv.writer(output)

        async for row in rows_generator:
            writer.writerow(row)
            yield output.getvalue().encode("utf-8")
            output.seek(0)
            output.truncate(0)

    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Content-Type": "text/csv; charset=utf-8"
    }
    return StreamingResponse(csv_stream(), headers=headers, media_type="text/csv")
