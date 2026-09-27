#!/bin/sh
set -eu

cd /var/www/html

if ! php -r '
$host = "database";
$port = 5432;
for ($i = 0; $i < 30; $i++) {
  $fp = @fsockopen($host, $port, $errno, $errstr, 1);
  if ($fp) { fclose($fp); exit(0); }
  sleep(1);
}
exit(1);
'; then
  echo "Base inaccessible" >&2
  exit 1
fi

export APP_ENV=test
export DATABASE_URL="$DATABASE_TEST_URL"

php bin/console doctrine:database:create --if-not-exists --no-interaction
php bin/console doctrine:migrations:migrate --no-interaction
php -d memory_limit=512M bin/phpunit
