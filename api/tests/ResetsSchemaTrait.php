<?php

declare(strict_types=1);

namespace App\Tests;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;

trait ResetsSchemaTrait
{
    private function resetDatabaseSchema(EntityManagerInterface $manager): void
    {
        $connection = $manager->getConnection();
        $schemaManager = $connection->createSchemaManager();
        $tables = $schemaManager->listTableNames();

        if ([] !== $tables) {
            $quoted = array_map(
                static fn (string $table): string => $connection->quoteSingleIdentifier($table),
                $tables,
            );
            $connection->executeStatement('DROP TABLE IF EXISTS '.implode(', ', $quoted).' CASCADE');
        }

        $schema = new SchemaTool($manager);
        $metadata = $manager->getMetadataFactory()->getAllMetadata();
        if ([] !== $metadata) {
            $schema->createSchema($metadata);
        }
    }
}
