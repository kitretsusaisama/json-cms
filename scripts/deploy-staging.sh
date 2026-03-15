#!/bin/bash

# Staging Deployment Script for JSON CMS Boilerplate
set -e

echo "🚀 Starting staging deployment..."

# Configuration
ENVIRONMENT="staging"
IMAGE_TAG=${1:-latest}
COMPOSE_FILE="docker-compose.staging.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f ".env.staging" ]; then
        log_error ".env.staging file not found. Copy from .env.staging.template"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Backup current deployment
backup_current() {
    log_info "Creating backup of current deployment..."
    
    # Create backup directory
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log_info "Backing up database..."
        docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U cms_user cms_staging > "$BACKUP_DIR/database.sql"
    fi
    
    # Backup uploaded files
    if [ -d "data/uploads" ]; then
        log_info "Backing up uploaded files..."
        cp -r data/uploads "$BACKUP_DIR/"
    fi
    
    log_info "Backup created at $BACKUP_DIR"
}

# Deploy application
deploy() {
    log_info "Deploying application with image tag: $IMAGE_TAG"
    
    # Set image tag
    export IMAGE_TAG="$IMAGE_TAG"
    
    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Stop current services
    log_info "Stopping current services..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Start new services
    log_info "Starting new services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Run database migrations
    log_info "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" exec -T app npm run migrate
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null; then
            log_info "Health check passed"
            return 0
        fi
        
        log_warn "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Test API endpoints
    if ! curl -f -s http://localhost:3000/api/cms/pages > /dev/null; then
        log_error "Pages API endpoint failed"
        return 1
    fi
    
    if ! curl -f -s http://localhost:3000/api/cms/blocks > /dev/null; then
        log_error "Blocks API endpoint failed"
        return 1
    fi
    
    log_info "Smoke tests passed"
}

# Rollback function
rollback() {
    log_error "Deployment failed, rolling back..."
    
    # Stop failed deployment
    docker-compose -f "$COMPOSE_FILE" down
    
    # Restore from backup if available
    LATEST_BACKUP=$(ls -t backups/ | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        log_info "Restoring from backup: $LATEST_BACKUP"
        
        # Restore database
        if [ -f "backups/$LATEST_BACKUP/database.sql" ]; then
            docker-compose -f "$COMPOSE_FILE" up -d postgres
            sleep 10
            docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U cms_user -d cms_staging < "backups/$LATEST_BACKUP/database.sql"
        fi
        
        # Restore files
        if [ -d "backups/$LATEST_BACKUP/uploads" ]; then
            rm -rf data/uploads
            cp -r "backups/$LATEST_BACKUP/uploads" data/
        fi
    fi
    
    log_error "Rollback completed"
    exit 1
}

# Cleanup old backups
cleanup_backups() {
    log_info "Cleaning up old backups..."
    find backups/ -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    log_info "Backup cleanup completed"
}

# Main deployment process
main() {
    log_info "Starting staging deployment process..."
    
    # Set trap for rollback on error
    trap rollback ERR
    
    check_prerequisites
    backup_current
    deploy
    
    if health_check && run_smoke_tests; then
        log_info "✅ Staging deployment completed successfully!"
        cleanup_backups
    else
        rollback
    fi
}

# Run main function
main "$@"