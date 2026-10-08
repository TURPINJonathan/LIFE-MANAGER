<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261008140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Travail : retenues mensuelles fixes (mutuelle, prévoyance, autres) sur work_job.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE work_job ADD monthly_mutuelle_cents INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE work_job ADD monthly_prevoyance_cents INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE work_job ADD monthly_other_deduction_cents INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE work_job ALTER monthly_mutuelle_cents DROP DEFAULT');
        $this->addSql('ALTER TABLE work_job ALTER monthly_prevoyance_cents DROP DEFAULT');
        $this->addSql('ALTER TABLE work_job ALTER monthly_other_deduction_cents DROP DEFAULT');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE work_job DROP monthly_mutuelle_cents');
        $this->addSql('ALTER TABLE work_job DROP monthly_prevoyance_cents');
        $this->addSql('ALTER TABLE work_job DROP monthly_other_deduction_cents');
    }
}
