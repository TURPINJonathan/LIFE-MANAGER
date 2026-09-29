<?php

declare(strict_types=1);

namespace App\Module\Account\Domain\Entity;

use App\Module\Account\Repository\MonthlyForecastRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: MonthlyForecastRepository::class)]
#[ORM\Table(name: 'monthly_forecast')]
#[ORM\UniqueConstraint(name: 'uniq_monthly_forecast_sub_month', columns: ['sub_account_id', 'year_month'])]
#[ORM\Index(name: 'idx_monthly_forecast_sub', columns: ['sub_account_id'])]
class MonthlyForecast
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: SubAccount::class)]
    #[ORM\JoinColumn(name: 'sub_account_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private SubAccount $subAccount;

    /** Format YYYY-MM */
    #[ORM\Column(name: 'year_month', length: 7)]
    private string $yearMonth;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /** @var Collection<int, ForecastLine> */
    #[ORM\OneToMany(targetEntity: ForecastLine::class, mappedBy: 'forecast', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $lines;

    public function __construct(SubAccount $subAccount, string $yearMonth)
    {
        $this->id = Uuid::v7();
        $this->subAccount = $subAccount;
        $this->yearMonth = self::normalizeYearMonth($yearMonth);
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
        $this->lines = new ArrayCollection();
    }

    public static function normalizeYearMonth(string $yearMonth): string
    {
        $yearMonth = trim($yearMonth);
        if (!preg_match('/^\d{4}-\d{2}$/', $yearMonth)) {
            throw new \InvalidArgumentException('Le mois doit être au format YYYY-MM.');
        }
        $year = (int) substr($yearMonth, 0, 4);
        $month = (int) substr($yearMonth, 5, 2);
        if ($month < 1 || $month > 12) {
            throw new \InvalidArgumentException('Le mois doit être entre 01 et 12.');
        }
        if ($year < 2000 || $year > 2100) {
            throw new \InvalidArgumentException('Année hors plage.');
        }

        return sprintf('%04d-%02d', $year, $month);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getSubAccount(): SubAccount
    {
        return $this->subAccount;
    }

    public function getYearMonth(): string
    {
        return $this->yearMonth;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    /**
     * @return Collection<int, ForecastLine>
     */
    public function getLines(): Collection
    {
        return $this->lines;
    }

    public function addLine(ForecastLine $line): void
    {
        if (!$this->lines->contains($line)) {
            $this->lines->add($line);
        }
    }

    public function clearLines(): void
    {
        $this->lines->clear();
    }
}
