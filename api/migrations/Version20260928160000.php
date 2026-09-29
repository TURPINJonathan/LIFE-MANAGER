<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260928160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add optional scheduled_days on forecast_line; allow duplicate categories per forecast';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE forecast_line ADD scheduled_days JSON NOT NULL DEFAULT \'[]\'');
        $this->addSql('DROP INDEX uniq_forecast_line_category');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE UNIQUE INDEX uniq_forecast_line_category ON forecast_line (forecast_id, category_id)');
        $this->addSql('ALTER TABLE forecast_line DROP scheduled_days');
    }
}
