<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261004173000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Travail : remplace display_name par first_name / last_name sur work_worker (données → prénom).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE work_worker ADD first_name VARCHAR(160) DEFAULT \'\' NOT NULL');
        $this->addSql('ALTER TABLE work_worker ADD last_name VARCHAR(160) DEFAULT \'\' NOT NULL');
        $this->addSql('UPDATE work_worker SET first_name = display_name, last_name = \'\'');
        $this->addSql('ALTER TABLE work_worker DROP display_name');
        $this->addSql('ALTER TABLE work_worker ALTER first_name DROP DEFAULT');
        $this->addSql('ALTER TABLE work_worker ALTER last_name DROP DEFAULT');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE work_worker ADD display_name VARCHAR(160) DEFAULT \'\' NOT NULL');
        $this->addSql("UPDATE work_worker SET display_name = TRIM(BOTH FROM CONCAT(first_name, ' ', last_name))");
        $this->addSql('ALTER TABLE work_worker DROP first_name');
        $this->addSql('ALTER TABLE work_worker DROP last_name');
        $this->addSql('ALTER TABLE work_worker ALTER display_name DROP DEFAULT');
    }
}
