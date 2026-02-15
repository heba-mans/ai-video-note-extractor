FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN true

# Copy project files
COPY . /app

# Create virtual environment inside container
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install dependencies
RUN pip install --upgrade pip
RUN pip install fastapi "uvicorn[standard]"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]