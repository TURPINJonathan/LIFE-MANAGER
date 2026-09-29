<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260928120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create monthly_forecast and forecast_line tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE monthly_forecast (
              id UUID NOT NULL,
              sub_account_id UUID NOT NULL,
              year_month VARCHAR(7) NOT NULL,
              created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX uniq_monthly_forecast_sub_month ON monthly_forecast (sub_account_id, year_month)');
        $this->addSql('CREATE INDEX idx_monthly_forecast_sub ON monthly_forecast (sub_account_id)');
        $this->addSql('ALTER TABLE monthly_forecast ADD CONSTRAINT fk_monthly_forecast_sub FOREIGN KEY (sub_account_id) REFERENCES sub_account (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql(<<<'SQL'
            CREATE TABLE forecast_line (
              id UUID NOT NULL,
              forecast_id UUID NOT NULL,
              category_id UUID NOT NULL,
              planned_amount_cents INT NOT NULL,
              flow VARCHAR(8) DEFAULT NULL,
              position INT NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX uniq_forecast_line_category ON forecast_line (forecast_id, category_id)');
        $this->addSql('CREATE INDEX idx_forecast_line_forecast ON forecast_line (forecast_id)');
        $this->addSql('ALTER TABLE forecast_line ADD CONSTRAINT fk_forecast_line_forecast FOREIGN KEY (forecast_id) REFERENCES monthly_forecast (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE forecast_line ADD CONSTRAINT fk_forecast_line_category FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE RESTRICT NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE forecast_line DROP CONSTRAINT fk_forecast_line_category');
        $this->addSql('ALTER TABLE forecast_line DROP CONSTRAINT fk_forecast_line_forecast');
        $this->addSql('ALTER TABLE monthly_forecast DROP CONSTRAINT fk_monthly_forecast_sub');
        $this->addSql('DROP TABLE forecast_line');
        $this->addSql('DROP TABLE monthly_forecast');
    }
}
