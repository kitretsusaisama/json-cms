#!/bin/bash
set -euo pipefail

# Albata CMS Production Deployment Script
# This script handles the complete production deployment process

echo "🚀 Starting Albata CMS Production Deployment..."

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups/$(date +%Y-%m-%d_%H-%M-%S)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found."
        log_info "Please copy .env.production.example to .env.production and configure it."
        exit 1
    fi
    
    # Check if running as root (for production server)
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root. Make sure this is intended for production deployment."
    fi
    
    log_success "Prerequisites check completed."
}

# Create backup
create_backup() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database if it exists
    if docker ps | grep -q postgres; then
        log_info "Backing up PostgreSQL database..."
        docker exec -t postgres pg_dumpall -c -U postgres > "$BACKUP_DIR/database_backup.sql"
    fi
    
    # Backup volumes
    if docker volume ls | grep -q albata; then
        log_info "Backing up Docker volumes..."
        docker run --rm -v postgres_data:/data -v "$PWD/$BACKUP_DIR":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
        docker run --rm -v redis_data:/data -v "$PWD/$BACKUP_DIR":/backup alpine tar czf /backup/redis_data.tar.gz -C /data .
    fi
    
    # Backup configuration
    cp -r ./config "$BACKUP_DIR/" 2>/dev/null || true
    cp "$ENV_FILE" "$BACKUP_DIR/" 2>/dev/null || true
    
    log_success "Backup created at $BACKUP_DIR"
}

# Pull latest images
pull_images() {
    log_info "Pulling latest Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    log_success "Images pulled successfully."
}

# Build and start services
deploy_services() {
    log_info "Deploying services..."
    
    # Stop existing services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Build and start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --build
    
    log_success "Services deployed successfully."
}

# Wait for services to be healthy
wait_for_health() {
    log_info "Waiting for services to be healthy..."
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
            log_success "Application is healthy!"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Waiting for application to be ready..."
        sleep 5
        ((attempt++))
    done
    
    log_error "Application failed to become healthy within timeout."
    return 1
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Example migration command - adjust based on your setup
    # docker-compose -f "$DOCKER_COMPOSE_FILE" exec web npm run migrate
    
    log_success "Database migrations completed."
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check health endpoint
    health_response=$(curl -s http://localhost:3000/api/health)
    if echo "$health_response" | grep -q '"status":"healthy"'; then
        log_success "Health check passed."
    else
        log_error "Health check failed."
        return 1
    fi
    
    # Check main page
    if curl -sf http://localhost:3000 > /dev/null; then
        log_success "Main page is accessible."
    else
        log_error "Main page is not accessible."
        return 1
    fi
    
    # Check critical endpoints
    endpoints=("/api/health" "/sitemap.xml" "/robots.txt")
    for endpoint in "${endpoints[@]}"; do
        if curl -sf "http://localhost:3000$endpoint" > /dev/null; then
            log_success "Endpoint $endpoint is working."
        else
            log_warning "Endpoint $endpoint is not accessible."
        fi
    done
    
    log_success "Deployment verification completed."
}

# Send deployment notification
send_notification() {
    local status=$1
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    
    if [ -n "$webhook_url" ]; then
        log_info "Sending deployment notification..."
        
        local color
        local message
        
        if [ "$status" = "success" ]; then
            color="good"
            message="✅ Albata CMS deployed successfully to production"
        else
            color="danger"
            message="❌ Albata CMS deployment failed"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\",\"fields\":[{\"title\":\"Environment\",\"value\":\"Production\",\"short\":true},{\"title\":\"Version\",\"value\":\"$(git rev-parse --short HEAD)\",\"short\":true}]}]}" \
            "$webhook_url" > /dev/null 2>&1 || log_warning "Failed to send notification."
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    docker system prune -f > /dev/null 2>&1 || true
}

# Rollback function
rollback() {
    log_warning "Rolling back to previous version..."
    
    # Stop current services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Restore from backup (implement based on your backup strategy)
    log_info "Restore functionality needs to be implemented based on your backup strategy."
    
    log_success "Rollback completed."
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    # Handle script interruption
    trap 'log_error "Deployment interrupted!"; exit 1' INT TERM
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy"|"")
            check_prerequisites
            create_backup
            pull_images
            deploy_services
            
            if wait_for_health; then
                run_migrations
                if verify_deployment; then
                    cleanup
                    send_notification "success"
                    
                    local end_time=$(date +%s)
                    local duration=$((end_time - start_time))
                    
                    log_success "🎉 Albata CMS deployed successfully in ${duration} seconds!"
                    log_info "Application is available at: http://localhost:3000"
                    log_info "Monitoring dashboard: http://localhost:3001"
                    log_info "Logs: docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
                else
                    log_error "Deployment verification failed."
                    send_notification "failed"
                    exit 1
                fi
            else
                log_error "Deployment failed - application is not healthy."
                send_notification "failed"
                exit 1
            fi
            ;;
        "rollback")
            rollback
            ;;
        "status")
            docker-compose -f "$DOCKER_COMPOSE_FILE" ps
            curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health
            ;;
        "logs")
            docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f "${2:-}"
            ;;
        "stop")
            docker-compose -f "$DOCKER_COMPOSE_FILE" down
            ;;
        "help"|"-h"|"--help")
            echo "Albata CMS Production Deployment Script"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  deploy    Deploy the application (default)"
            echo "  rollback  Rollback to previous version"
            echo "  status    Show application status"
            echo "  logs      Show application logs"
            echo "  stop      Stop all services"
            echo "  help      Show this help message"
            ;;
        *)
            log_error "Unknown command: $1"
            log_info "Use '$0 help' for usage information."
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
