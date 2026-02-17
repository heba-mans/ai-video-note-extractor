FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt /app/requirements.txt

RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"

RUN pip install --upgrade pip
RUN pip install -r /app/requirements.txt

COPY . /app

CMD ["sleep", "infinity"]
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*