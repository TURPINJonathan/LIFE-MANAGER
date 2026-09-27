<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260927151314 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create app_user table';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql(<<<'SQL'
            CREATE TABLE app_user (
              id UUID NOT NULL,
              email VARCHAR(180) NOT NULL,
              password VARCHAR(255) NOT NULL,
              roles JSON NOT NULL,
              first_name VARCHAR(100) NOT NULL,
              last_name VARCHAR(100) NOT NULL,
              created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
              PRIMARY KEY (id)
            )
        SQL);
        $this->addSql('CREATE UNIQUE INDEX uniq_app_user_email ON app_user (email)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE app_user');
    }
}
