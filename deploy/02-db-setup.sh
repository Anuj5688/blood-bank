#!/usr/bin/env bash
# deploy/02-db-setup.sh
#
# Run ONCE, after 01-server-setup.sh. Creates the database and app user.
# You'll be prompted to set a password for the new DB user — save it,
# you'll need it for the api-server's DATABASE_URL.

set -euo pipefail

DB_NAME="blood_bank"
DB_USER="blood_bank_app"

echo "==> Creating database '$DB_NAME' and user '$DB_USER'"
echo "You will be prompted to set a password for '$DB_USER'."
read -rsp "Enter a password for the '$DB_USER' database user: " DB_PASSWORD
echo

sudo -u postgres psql <<SQL
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
SQL

echo "==> Done."
echo ""
echo "Your DATABASE_URL is:"
echo "postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"
echo ""
echo "Save this into artifacts/api-server/.env as DATABASE_URL"
echo "(PostgreSQL is only listening on localhost by default — that's correct,"
echo " the API runs on the same VPS so it doesn't need to be exposed publicly.)"
