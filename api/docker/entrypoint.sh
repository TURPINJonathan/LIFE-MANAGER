#!/bin/sh
set -e

cd /var/www/html

mkdir -p var/cache var/log
chmod -R 777 var

echo "[entrypoint] Waiting for database..."
php -r '
$host = "database";
$port = 5432;
for ($i = 0; $i < 30; $i++) {
  $fp = @fsockopen($host, $port, $errno, $errstr, 1);
  if ($fp) { fclose($fp); exit(0); }
  sleep(1);
}
fwrite(STDERR, "DB not reachable\n");
exit(1);
'

if [ -f vendor/autoload.php ] && ls migrations/*.php >/dev/null 2>&1; then
  echo "[entrypoint] Running migrations..."
  php bin/console doctrine:migrations:migrate --no-interaction
else
  echo "[entrypoint] No vendor or migrations yet, skipping."
fi

echo "[entrypoint] Starting process: $*"
exec "$@"
