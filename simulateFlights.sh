#!/usr/bin/env bash

set -euo pipefail

BASE_URL="http://localhost:3000"

command -v curl >/dev/null 2>&1 || {
  printf "curl is required but not installed.\n" >&2
  exit 1
}

flights=(
  '{"flightNumber":"AI203","airline":"Air India","type":"landing"}'
  '{"flightNumber":"BA147","airline":"British Airways","type":"takeoff"}'
  '{"flightNumber":"DL404","airline":"Delta","type":"landing"}'
  '{"flightNumber":"UA710","airline":"United","type":"takeoff"}'
  '{"flightNumber":"LH990","airline":"Lufthansa","type":"landing"}'
  '{"flightNumber":"QF32","airline":"Qantas","type":"takeoff"}'
)

for payload in "${flights[@]}"; do
  curl -s -X POST "${BASE_URL}/flights" \
    -H "Content-Type: application/json" \
    -d "${payload}"
  printf "\n"
  sleep 0.2
done

printf "\nQueued flights:\n"
curl -s "${BASE_URL}/queue"
printf "\n"
