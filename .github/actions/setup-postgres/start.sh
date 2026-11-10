#!/usr/bin/env bash
set -euo pipefail

stage='validate_settings'
task_pg_dir=''
owns_directory=false
finish() {
  local result=$?
  if [[ "$owns_directory" == true ]]; then rm -f "$task_pg_dir/password"; fi
  if (( result != 0 )); then
    printf '::error title=Native PostgreSQL setup failed::Stage: %s\n' "$stage" >&2
  fi
}
trap finish EXIT

[[ "${PGUSER:-}" =~ ^amc_[a-z0-9_]+$ ]] || exit 1
[[ "${PGDATABASE:-}" =~ ^amc_([a-z0-9_]+_)?test$ ]] || exit 1
[[ -n "${PGPASSWORD:-}" && -n "${RUNNER_TEMP:-}" ]] || exit 1
umask 077
task_pg_dir="$RUNNER_TEMP/amc-ci-postgres"
stage='create_private_directory'
mkdir "$task_pg_dir"
owns_directory=true
printf '%s\n' "$PGPASSWORD" > "$task_pg_dir/password"

stage='initialize_database'
# initdb reports only this fresh cluster's setup, never the password file contents.
initdb --pgdata="$task_pg_dir/data" --username="$PGUSER" \
  --auth-local=trust --auth-host=scram-sha-256 --pwfile="$task_pg_dir/password"

stage='start_server'
pg_ctl --pgdata="$task_pg_dir/data" --log="$task_pg_dir/server.log" \
  --options="-h 127.0.0.1 -p 55432 -c unix_socket_directories=''" --wait start

stage='create_test_database'
createdb --maintenance-db=postgres --no-password --owner="$PGUSER" "$PGDATABASE"
