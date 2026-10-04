<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261003140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Planning prévisionnel Travail (work_plan_entry / work_plan_segment).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE work_plan_entry (
            id UUID NOT NULL,
            job_id UUID NOT NULL,
            work_date DATE NOT NULL,
            pause_minutes INT NOT NULL,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_work_plan_entry_job ON work_plan_entry (job_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_work_plan_entry_job_date ON work_plan_entry (job_id, work_date)');
        $this->addSql('ALTER TABLE work_plan_entry ADD CONSTRAINT FK_WORK_PLAN_ENTRY_JOB FOREIGN KEY (job_id) REFERENCES work_job (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE work_plan_segment (
            id UUID NOT NULL,
            plan_entry_id UUID NOT NULL,
            start_time TIME(0) WITHOUT TIME ZONE NOT NULL,
            end_time TIME(0) WITHOUT TIME ZONE NOT NULL,
            position INT NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_work_plan_segment_entry ON work_plan_segment (plan_entry_id)');
        $this->addSql('ALTER TABLE work_plan_segment ADD CONSTRAINT FK_WORK_PLAN_SEGMENT_ENTRY FOREIGN KEY (plan_entry_id) REFERENCES work_plan_entry (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE work_plan_segment DROP CONSTRAINT FK_WORK_PLAN_SEGMENT_ENTRY');
        $this->addSql('ALTER TABLE work_plan_entry DROP CONSTRAINT FK_WORK_PLAN_ENTRY_JOB');
        $this->addSql('DROP TABLE work_plan_segment');
        $this->addSql('DROP TABLE work_plan_entry');
    }
}
