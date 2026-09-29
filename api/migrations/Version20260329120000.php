<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260329120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Link categories and merchants (M2M) with optional favorite merchant per category.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE category_merchant (category_id UUID NOT NULL, merchant_id UUID NOT NULL, PRIMARY KEY (category_id, merchant_id))');
        $this->addSql('CREATE INDEX IDX_CATEGORY_MERCHANT_CATEGORY ON category_merchant (category_id)');
        $this->addSql('CREATE INDEX IDX_CATEGORY_MERCHANT_MERCHANT ON category_merchant (merchant_id)');
        $this->addSql('ALTER TABLE category_merchant ADD CONSTRAINT FK_CATEGORY_MERCHANT_CATEGORY FOREIGN KEY (category_id) REFERENCES category (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE category_merchant ADD CONSTRAINT FK_CATEGORY_MERCHANT_MERCHANT FOREIGN KEY (merchant_id) REFERENCES merchant (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE category ADD favorite_merchant_id UUID DEFAULT NULL');
        $this->addSql('CREATE INDEX IDX_CATEGORY_FAVORITE_MERCHANT ON category (favorite_merchant_id)');
        $this->addSql('ALTER TABLE category ADD CONSTRAINT FK_CATEGORY_FAVORITE_MERCHANT FOREIGN KEY (favorite_merchant_id) REFERENCES merchant (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE category DROP CONSTRAINT FK_CATEGORY_FAVORITE_MERCHANT');
        $this->addSql('DROP INDEX IDX_CATEGORY_FAVORITE_MERCHANT');
        $this->addSql('ALTER TABLE category DROP favorite_merchant_id');
        $this->addSql('ALTER TABLE category_merchant DROP CONSTRAINT FK_CATEGORY_MERCHANT_CATEGORY');
        $this->addSql('ALTER TABLE category_merchant DROP CONSTRAINT FK_CATEGORY_MERCHANT_MERCHANT');
        $this->addSql('DROP TABLE category_merchant');
    }
}
