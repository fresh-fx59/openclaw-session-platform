#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${REPO_DIR}/docker-compose.yml"
TENANT_PREFIX="${TENANT_PREFIX:-openclaw-tenant-}"
APP_CONTAINER="${APP_CONTAINER:-openclaw-session-platform}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-openclaw-session-platform-postgres}"

usage() {
  cat <<'EOF'
Usage: session-platform-stack.sh <start|stop|restart|status> [--build]

Commands:
  start     Start Docker Compose services, then start discovered tenant containers.
  stop      Stop discovered tenant containers, then stop Docker Compose services.
  restart   Stop then start the full stack.
  status    Show current service and tenant container states.

Options:
  --build   Pass through to "docker compose up -d --build" during start.
EOF
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required but not installed." >&2
    exit 1
  fi
}

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

list_tenant_containers() {
  docker ps -a \
    --filter "name=^${TENANT_PREFIX}" \
    --format '{{.Names}}' \
    | sort
}

print_container_status() {
  local name="$1"
  docker ps -a --filter "name=^${name}$" --format '{{.Names}}\t{{.Status}}'
}

status() {
  echo "Compose services:"
  local app_status postgres_status
  app_status="$(print_container_status "${APP_CONTAINER}" || true)"
  postgres_status="$(print_container_status "${POSTGRES_CONTAINER}" || true)"

  if [[ -n "${app_status}" ]]; then
    echo "${app_status}"
  else
    echo "${APP_CONTAINER}\tnot found"
  fi

  if [[ -n "${postgres_status}" ]]; then
    echo "${postgres_status}"
  else
    echo "${POSTGRES_CONTAINER}\tnot found"
  fi

  echo
  echo "Tenant containers:"
  mapfile -t tenants < <(list_tenant_containers)
  if [[ "${#tenants[@]}" -eq 0 ]]; then
    echo "none"
    return 0
  fi

  local tenant
  for tenant in "${tenants[@]}"; do
    print_container_status "${tenant}"
  done
}

stop_tenants() {
  mapfile -t tenants < <(list_tenant_containers)
  if [[ "${#tenants[@]}" -eq 0 ]]; then
    echo "No tenant containers found."
    return 0
  fi

  local tenant
  for tenant in "${tenants[@]}"; do
    local running
    running="$(docker ps --filter "name=^${tenant}$" --format '{{.Names}}')"
    if [[ -n "${running}" ]]; then
      echo "Stopping tenant ${tenant}"
      docker stop "${tenant}" >/dev/null
    else
      echo "Tenant ${tenant} is already stopped."
    fi
  done
}

start_tenants() {
  mapfile -t tenants < <(list_tenant_containers)
  if [[ "${#tenants[@]}" -eq 0 ]]; then
    echo "No tenant containers found."
    return 0
  fi

  local tenant
  for tenant in "${tenants[@]}"; do
    local running
    running="$(docker ps --filter "name=^${tenant}$" --format '{{.Names}}')"
    if [[ -n "${running}" ]]; then
      echo "Tenant ${tenant} is already running."
    else
      echo "Starting tenant ${tenant}"
      docker start "${tenant}" >/dev/null
    fi
  done
}

start_stack() {
  local compose_args=(up -d)
  if [[ "${BUILD_FLAG:-0}" == "1" ]]; then
    compose_args+=(--build)
  fi

  echo "Starting compose services"
  compose "${compose_args[@]}"

  echo
  start_tenants
}

stop_stack() {
  stop_tenants

  echo
  echo "Stopping compose services"
  compose stop
}

main() {
  require_docker

  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    echo "Compose file not found: ${COMPOSE_FILE}" >&2
    exit 1
  fi

  if [[ $# -lt 1 ]]; then
    usage
    exit 1
  fi

  local command="$1"
  shift

  BUILD_FLAG=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --build)
        BUILD_FLAG=1
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        exit 1
        ;;
    esac
    shift
  done

  case "${command}" in
    start)
      start_stack
      ;;
    stop)
      stop_stack
      ;;
    restart)
      stop_stack
      echo
      start_stack
      ;;
    status)
      status
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      echo "Unknown command: ${command}" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
