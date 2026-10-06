# CardioMap Pipeline & Backend Makefile

VENV := $(shell if [ -f venv/bin/python ]; then echo "venv/bin/"; elif [ -f cardiomap/venv/bin/python ]; then echo "cardiomap/venv/bin/"; else echo ""; fi)
PYTHON := $(VENV)python
PYTEST := $(VENV)pytest
UVICORN := $(VENV)uvicorn

TESTS_DIR := $(shell if [ -d ml/tests ]; then echo "ml/tests/"; else echo "cardiomap/ml/tests/"; fi)
REPORTS_DIR := $(shell if [ -d reports ]; then echo "reports/"; else echo "cardiomap/reports/"; fi)

.PHONY: help install train test serve report clean

help:
	@echo "CardioMap Commands:"
	@echo "  make install   Install dependencies in virtualenv"
	@echo "  make train     Run nested CV, model selection, calibration, and artifact export"
	@echo "  make test      Run pytest suite (leakage, schema, determinism, API contract)"
	@echo "  make serve     Start FastAPI development server at http://localhost:8000"
	@echo "  make report    Print dataset audit and model comparison tables"
	@echo "  make clean     Remove cache and temporary files"

install:
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -r requirements.txt

train:
	PYTHONPATH=.:.. $(PYTHON) -m cardiomap.ml.src.train

test:
	PYTHONPATH=.:.. $(PYTEST) $(TESTS_DIR) -v

serve:
	PYTHONPATH=.:.. $(UVICORN) cardiomap.backend.app.main:app --host 0.0.0.0 --port 8000 --reload

report:
	@echo "\n=== DATA AUDIT SUMMARY ==="
	@head -n 25 $(REPORTS_DIR)data_audit.md
	@echo "\n=== MODEL COMPARISON TABLE ==="
	@cat $(REPORTS_DIR)model_comparison.csv

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
