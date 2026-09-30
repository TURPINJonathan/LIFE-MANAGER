<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260928140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Allow nullable effective_date on ledger_transaction (pending ops)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE ledger_transaction ALTER COLUMN effective_date DROP NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('UPDATE ledger_transaction SET effective_date = operation_date WHERE effective_date IS NULL');
        $this->addSql('ALTER TABLE ledger_transaction ALTER COLUMN effective_date SET NOT NULL');
    }
}
