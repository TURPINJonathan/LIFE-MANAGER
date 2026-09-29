<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260928200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create merchant table and add merchant/attachment fields on ledger_transaction';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE merchant (
              id UUID NOT NULL,
              owner_id UUID NOT NULL,
              name VARCHAR(120) NOT NULL,
              color VARCHAR(7) NOT NULL,
              icon VARCHAR(64) DEFAULT NULL,
              image_path VARCHAR(512) DEFAULT NULL,
              position INT NOT NULL,
              archived_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
              created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_merchant_owner ON merchant (owner_id)');
        $this->addSql('ALTER TABLE merchant ADD CONSTRAINT fk_merchant_owner FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('ALTER TABLE ledger_transaction ADD merchant_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE ledger_transaction ADD attachment_path VARCHAR(512) DEFAULT NULL');
        $this->addSql('ALTER TABLE ledger_transaction ADD attachment_mime VARCHAR(127) DEFAULT NULL');
        $this->addSql('ALTER TABLE ledger_transaction ADD attachment_original_name VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE ledger_transaction ADD attachment_size INT DEFAULT NULL');
        $this->addSql('CREATE INDEX idx_ledger_tx_merchant ON ledger_transaction (merchant_id)');
        $this->addSql('ALTER TABLE ledger_transaction ADD CONSTRAINT fk_ledger_tx_merchant FOREIGN KEY (merchant_id) REFERENCES merchant (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE ledger_transaction DROP CONSTRAINT fk_ledger_tx_merchant');
        $this->addSql('DROP INDEX idx_ledger_tx_merchant');
        $this->addSql('ALTER TABLE ledger_transaction DROP merchant_id');
        $this->addSql('ALTER TABLE ledger_transaction DROP attachment_path');
        $this->addSql('ALTER TABLE ledger_transaction DROP attachment_mime');
        $this->addSql('ALTER TABLE ledger_transaction DROP attachment_original_name');
        $this->addSql('ALTER TABLE ledger_transaction DROP attachment_size');

        $this->addSql('ALTER TABLE merchant DROP CONSTRAINT fk_merchant_owner');
        $this->addSql('DROP INDEX idx_merchant_owner');
        $this->addSql('DROP TABLE merchant');
    }
}
