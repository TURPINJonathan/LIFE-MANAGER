<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260927180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create account, sub_account, category and ledger_transaction tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE category (
              id UUID NOT NULL,
              owner_id UUID NOT NULL,
              name VARCHAR(120) NOT NULL,
              icon VARCHAR(64) NOT NULL,
              color VARCHAR(7) NOT NULL,
              kind VARCHAR(16) NOT NULL,
              position INT NOT NULL,
              archived_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
              created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_category_owner ON category (owner_id)');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT fk_category_owner FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql(<<<'SQL'
            CREATE TABLE account (
              id UUID NOT NULL,
              owner_id UUID NOT NULL,
              name VARCHAR(160) NOT NULL,
              notes TEXT DEFAULT NULL,
              position INT NOT NULL,
              archived_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
              created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_account_owner ON account (owner_id)');
        $this->addSql('ALTER TABLE account ADD CONSTRAINT fk_account_owner FOREIGN KEY (owner_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql(<<<'SQL'
            CREATE TABLE sub_account (
              id UUID NOT NULL,
              account_id UUID NOT NULL,
              name VARCHAR(160) NOT NULL,
              icon VARCHAR(64) NOT NULL,
              color VARCHAR(7) NOT NULL,
              opening_balance_cents INT NOT NULL,
              position INT NOT NULL,
              archived_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
              created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_sub_account_account ON sub_account (account_id)');
        $this->addSql('ALTER TABLE sub_account ADD CONSTRAINT fk_sub_account_account FOREIGN KEY (account_id) REFERENCES account (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql(<<<'SQL'
            CREATE TABLE ledger_transaction (
              id UUID NOT NULL,
              sub_account_id UUID NOT NULL,
              category_id UUID NOT NULL,
              operation_date DATE NOT NULL,
              effective_date DATE NOT NULL,
              payment_method VARCHAR(32) NOT NULL,
              check_number VARCHAR(64) DEFAULT NULL,
              designation VARCHAR(255) NOT NULL,
              amount_cents INT NOT NULL,
              created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE INDEX idx_ledger_tx_sub_account ON ledger_transaction (sub_account_id)');
        $this->addSql('CREATE INDEX idx_ledger_tx_effective ON ledger_transaction (sub_account_id, effective_date, operation_date, id)');
        $this->addSql('ALTER TABLE ledger_transaction ADD CONSTRAINT fk_ledger_tx_sub_account FOREIGN KEY (sub_account_id) REFERENCES sub_account (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE ledger_transaction ADD CONSTRAINT fk_ledger_tx_category FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE RESTRICT NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE ledger_transaction DROP CONSTRAINT fk_ledger_tx_category');
        $this->addSql('ALTER TABLE ledger_transaction DROP CONSTRAINT fk_ledger_tx_sub_account');
        $this->addSql('DROP TABLE ledger_transaction');
        $this->addSql('ALTER TABLE sub_account DROP CONSTRAINT fk_sub_account_account');
        $this->addSql('DROP TABLE sub_account');
        $this->addSql('ALTER TABLE account DROP CONSTRAINT fk_account_owner');
        $this->addSql('DROP TABLE account');
        $this->addSql('ALTER TABLE category DROP CONSTRAINT fk_category_owner');
        $this->addSql('DROP TABLE category');
    }
}
