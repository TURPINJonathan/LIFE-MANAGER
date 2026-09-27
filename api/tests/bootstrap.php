<?php

declare(strict_types=1);

use Symfony\Component\Dotenv\Dotenv;

require dirname(__DIR__).'/vendor/autoload.php';

$_SERVER['APP_ENV'] = 'test';
$_ENV['APP_ENV'] = 'test';
putenv('APP_ENV=test');

(new Dotenv())->bootEnv(dirname(__DIR__).'/.env');

$databaseUrl = (string) ($_SERVER['DATABASE_URL'] ?? '');
if (!str_contains($databaseUrl, 'life_manager_test')) {
    throw new RuntimeException('Configuration de test refusée : DATABASE_URL doit viser life_manager_test.');
}
