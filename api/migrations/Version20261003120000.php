<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261003120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Module Travail : workers, jobs, documents, pointages, raccourcis.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE work_worker (
            id UUID NOT NULL,
            owner_id UUID NOT NULL,
            display_name VARCHAR(160) NOT NULL,
            notes TEXT DEFAULT NULL,
            position INT NOT NULL,
            archived_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_work_worker_owner ON work_worker (owner_id)');
        $this->addSql('ALTER TABLE work_worker ADD CONSTRAINT FK_WORK_WORKER_OWNER FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE work_job (
            id UUID NOT NULL,
            worker_id UUID NOT NULL,
            title VARCHAR(160) NOT NULL,
            company_name VARCHAR(160) NOT NULL,
            company_siret VARCHAR(14) DEFAULT NULL,
            contract_type VARCHAR(32) NOT NULL,
            status VARCHAR(32) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            color VARCHAR(32) DEFAULT NULL,
            icon VARCHAR(64) DEFAULT NULL,
            position INT NOT NULL,
            contract_weekly_minutes INT NOT NULL,
            time_tracking_enabled BOOLEAN NOT NULL,
            week_starts_on SMALLINT NOT NULL,
            work_days_mask SMALLINT NOT NULL,
            gross_hourly_rate_cents INT NOT NULL,
            overtime_rate_bps INT NOT NULL,
            overtime_rate2bps INT DEFAULT NULL,
            overtime_threshold_weekly_minutes INT DEFAULT NULL,
            employee_contribution_rate_bps INT NOT NULL,
            pas_rate_bps INT NOT NULL,
            net_estimate_mode VARCHAR(32) NOT NULL,
            archived_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_work_job_worker ON work_job (worker_id)');
        $this->addSql('ALTER TABLE work_job ADD CONSTRAINT FK_WORK_JOB_WORKER FOREIGN KEY (worker_id) REFERENCES work_worker (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE work_document (
            id UUID NOT NULL,
            job_id UUID NOT NULL,
            kind VARCHAR(32) NOT NULL,
            label VARCHAR(200) NOT NULL,
            year_month VARCHAR(7) DEFAULT NULL,
            path VARCHAR(512) DEFAULT NULL,
            mime VARCHAR(128) DEFAULT NULL,
            original_name VARCHAR(255) DEFAULT NULL,
            size INT DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_work_document_job ON work_document (job_id)');
        $this->addSql('ALTER TABLE work_document ADD CONSTRAINT FK_WORK_DOCUMENT_JOB FOREIGN KEY (job_id) REFERENCES work_job (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE work_time_entry (
            id UUID NOT NULL,
            job_id UUID NOT NULL,
            work_date DATE NOT NULL,
            pause_minutes INT NOT NULL,
            worked_minutes_override INT DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_work_time_entry_job ON work_time_entry (job_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_work_time_entry_job_date ON work_time_entry (job_id, work_date)');
        $this->addSql('ALTER TABLE work_time_entry ADD CONSTRAINT FK_WORK_TIME_ENTRY_JOB FOREIGN KEY (job_id) REFERENCES work_job (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE work_time_segment (
            id UUID NOT NULL,
            time_entry_id UUID NOT NULL,
            start_time TIME(0) WITHOUT TIME ZONE NOT NULL,
            end_time TIME(0) WITHOUT TIME ZONE NOT NULL,
            position INT NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_work_time_segment_entry ON work_time_segment (time_entry_id)');
        $this->addSql('ALTER TABLE work_time_segment ADD CONSTRAINT FK_WORK_TIME_SEGMENT_ENTRY FOREIGN KEY (time_entry_id) REFERENCES work_time_entry (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('CREATE TABLE work_time_shortcut (
            id UUID NOT NULL,
            job_id UUID NOT NULL,
            label VARCHAR(120) NOT NULL,
            segments JSON NOT NULL,
            pause_minutes INT NOT NULL,
            position INT NOT NULL,
            PRIMARY KEY (id)
        )');
        $this->addSql('CREATE INDEX idx_work_time_shortcut_job ON work_time_shortcut (job_id)');
        $this->addSql('ALTER TABLE work_time_shortcut ADD CONSTRAINT FK_WORK_TIME_SHORTCUT_JOB FOREIGN KEY (job_id) REFERENCES work_job (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE work_time_shortcut DROP CONSTRAINT FK_WORK_TIME_SHORTCUT_JOB');
        $this->addSql('ALTER TABLE work_time_segment DROP CONSTRAINT FK_WORK_TIME_SEGMENT_ENTRY');
        $this->addSql('ALTER TABLE work_time_entry DROP CONSTRAINT FK_WORK_TIME_ENTRY_JOB');
        $this->addSql('ALTER TABLE work_document DROP CONSTRAINT FK_WORK_DOCUMENT_JOB');
        $this->addSql('ALTER TABLE work_job DROP CONSTRAINT FK_WORK_JOB_WORKER');
        $this->addSql('ALTER TABLE work_worker DROP CONSTRAINT FK_WORK_WORKER_OWNER');
        $this->addSql('DROP TABLE work_time_shortcut');
        $this->addSql('DROP TABLE work_time_segment');
        $this->addSql('DROP TABLE work_time_entry');
        $this->addSql('DROP TABLE work_document');
        $this->addSql('DROP TABLE work_job');
        $this->addSql('DROP TABLE work_worker');
    }
}
