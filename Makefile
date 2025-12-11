COPYBARA_DIR := $(HOME)/copybara
COPYBARA_JAR := $(COPYBARA_DIR)/copybara_deploy.jar

.PHONY: all help
all: help

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

copybara-install: ## Download the Copybara .jar file to $COPYBARA_DIR and make it executable
	@echo "Downloading Copybara..."
	@echo "COPYBARA_DIR: $(COPYBARA_DIR)"
	@echo "COPYBARA_JAR: $(COPYBARA_JAR)"
	@mkdir -p $(COPYBARA_DIR)
	@curl -L -o $(COPYBARA_JAR) https://github.com/google/copybara/releases/download/v20251208/copybara_deploy.jar
	@chmod +x $(COPYBARA_JAR)

copybara-sync: ## Sync aa-backend-integrations and agent-assist-ui-modules from Gerrit to GitHub with Copybara
	@echo "Syncing aa-backend-integrations and agent-assist-ui-modules from Gerrit to GitHub with Copybara..."
	@java -jar $(COPYBARA_JAR) migrate copy.bara.sky backend_sync || echo "Backend sync finished with status $$?"
	@java -jar $(COPYBARA_JAR) migrate copy.bara.sky frontend_sync || echo "Frontend sync finished with status $$?"