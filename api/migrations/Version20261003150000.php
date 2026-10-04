<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261003150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Travail : semaine type (week_template) sur work_job.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE work_job ADD week_template JSON DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE work_job DROP week_template');
    }
}
