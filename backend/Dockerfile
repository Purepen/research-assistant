# Backend — FastAPI + OpenAI Agents pipeline
# Multi-stage build: install deps with uv (uses uv.lock for reproducibility),
# then copy just the venv + app code into a slim runtime image.

FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv==0.9.9

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project


FROM python:3.12-slim AS runtime

RUN groupadd --system app && useradd --system --gid app app

WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY app ./app
COPY migrate.py ./

RUN mkdir -p storage && chown -R app:app /app
USER app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
