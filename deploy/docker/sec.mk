# sec environment variables
REGISTRY_sec=asia-northeast3-docker.pkg.dev/sec-bdp-user-dev/self-scheduling
PROJECT_sec=sec-bdp-user-dev
REGION_sec=asia-northeast3
CLUSTER_NAME_sec=platform-d-gke-bdp-an3

# sec environment commands
build-sec:
	@echo "Start building docker images for sec environment..."
	@echo "Building '$(APP_NAME)' from current directory..."; \
	command="docker build --build-arg ENV=sec -f deploy/docker/Dockerfile -t $(REGISTRY_sec)/$(APP_NAME_LOWER):latest -t $(REGISTRY_sec)/$(APP_NAME_LOWER):$(shell git rev-parse --short HEAD) ."; \
	echo $$command; \
	eval $$command || { echo "Docker build failed for $(APP_NAME)"; exit 1; }; \

push-sec:
	@echo "Start pushing docker images for sec environment..."
	@command="docker push $(REGISTRY_sec)/$(APP_NAME_LOWER):latest; docker push $(REGISTRY_sec)/$(APP_NAME_LOWER):$(shell git rev-parse --short HEAD)" ;\
	echo $$command ;\
	eval $$command ;\

restart-sec:
	@echo "Restarting application in sec environment..."
	@gcloud container clusters get-credentials $(CLUSTER_NAME_sec) --region $(REGION_sec) --project $(PROJECT_sec) || { echo "Failed to get GKE credentials"; exit 1; }; \
	kubectl rollout restart deployment/$(APP_NAME_LOWER) || { echo "Failed to restart deployment"; exit 1; }; \
	echo "Application restart initiated. Use 'kubectl get pods' to monitor status."

 
clean-old-images:
	@echo "Cleaning up old images for repository: $(REGISTRY_sec)/$(APP_NAME_LOWER)"
	@IMAGES_TO_DELETE=$$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" $(REGISTRY_sec)/$(APP_NAME_LOWER) | tail -n +5 | awk '{print $$1}'); \
	if [ -z "$$IMAGES_TO_DELETE" ]; then \
		echo "No images to delete. Keeping all existing images."; \
	else \
		echo "Deleting the following images:"; \
		echo "$$IMAGES_TO_DELETE"; \
		echo "$$IMAGES_TO_DELETE" | xargs -r docker rmi; \
	fi