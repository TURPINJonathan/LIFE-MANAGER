<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
use Symfony\Component\Uid\Uuid;

final class Version20260928180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Replace forecast_line.scheduled_days[] with scheduled_day (one day = one amount)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE forecast_line ADD scheduled_day SMALLINT DEFAULT NULL');

        $rows = $this->connection->fetchAllAssociative('SELECT id, forecast_id, category_id, planned_amount_cents, flow, position, scheduled_days FROM forecast_line');
        foreach ($rows as $row) {
            $days = json_decode((string) $row['scheduled_days'], true);
            if (!\is_array($days) || [] === $days) {
                continue;
            }
            $normalized = [];
            foreach ($days as $day) {
                $value = (int) $day;
                if ($value >= 1 && $value <= 31) {
                    $normalized[$value] = $value;
                }
            }
            $normalized = array_values($normalized);
            sort($normalized);
            if ([] === $normalized) {
                continue;
            }

            $this->connection->update('forecast_line', ['scheduled_day' => $normalized[0]], ['id' => $row['id']]);

            for ($i = 1, $count = \count($normalized); $i < $count; ++$i) {
                $this->connection->insert('forecast_line', [
                    'id' => (string) Uuid::v7(),
                    'forecast_id' => $row['forecast_id'],
                    'category_id' => $row['category_id'],
                    'planned_amount_cents' => $row['planned_amount_cents'],
                    'flow' => $row['flow'],
                    'position' => ((int) $row['position']) + $i,
                    'scheduled_day' => $normalized[$i],
                    'scheduled_days' => '[]',
                ]);
            }
        }

        $this->addSql('ALTER TABLE forecast_line DROP scheduled_days');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE forecast_line ADD scheduled_days JSON NOT NULL DEFAULT '[]'");
        $this->addSql("UPDATE forecast_line SET scheduled_days = CASE WHEN scheduled_day IS NULL THEN '[]'::json ELSE json_build_array(scheduled_day) END");
        $this->addSql('ALTER TABLE forecast_line DROP scheduled_day');
    }
}
