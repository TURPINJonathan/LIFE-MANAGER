<?php

declare(strict_types=1);

namespace App\Module\Account\Domain\Entity;

use App\Module\Account\Repository\ForecastLineRepository;
use App\Module\Category\Domain\Entity\Category;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ForecastLineRepository::class)]
#[ORM\Table(name: 'forecast_line')]
#[ORM\Index(name: 'idx_forecast_line_forecast', columns: ['forecast_id'])]
class ForecastLine
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: MonthlyForecast::class, inversedBy: 'lines')]
    #[ORM\JoinColumn(name: 'forecast_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private MonthlyForecast $forecast;

    #[ORM\ManyToOne(targetEntity: Category::class)]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', nullable: false, onDelete: 'RESTRICT')]
    private Category $category;

    /** Absolute planned amount (> 0). Sign derived from category kind (+ flow). */
    #[ORM\Column(type: Types::INTEGER)]
    private int $plannedAmountCents;

    /** credit|debit only when category kind is both; otherwise null. */
    #[ORM\Column(length: 8, nullable: true)]
    private ?string $flow;

    /** Optional calendar day in the month (1–31). Null = no specific day. */
    #[ORM\Column(type: Types::SMALLINT, nullable: true)]
    private ?int $scheduledDay = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position;

    public function __construct(
        MonthlyForecast $forecast,
        Category $category,
        int $plannedAmountCents,
        ?string $flow = null,
        int $position = 0,
        ?int $scheduledDay = null,
    ) {
        $this->id = Uuid::v7();
        $this->forecast = $forecast;
        $this->category = $category;
        $this->plannedAmountCents = $plannedAmountCents;
        $this->flow = $flow;
        $this->position = $position;
        $this->scheduledDay = $scheduledDay;
        $forecast->addLine($this);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getForecast(): MonthlyForecast
    {
        return $this->forecast;
    }

    public function getCategory(): Category
    {
        return $this->category;
    }

    public function getPlannedAmountCents(): int
    {
        return $this->plannedAmountCents;
    }

    public function setPlannedAmountCents(int $plannedAmountCents): void
    {
        $this->plannedAmountCents = $plannedAmountCents;
    }

    public function getFlow(): ?string
    {
        return $this->flow;
    }

    public function setFlow(?string $flow): void
    {
        $this->flow = $flow;
    }

    public function getScheduledDay(): ?int
    {
        return $this->scheduledDay;
    }

    public function setScheduledDay(?int $scheduledDay): void
    {
        $this->scheduledDay = $scheduledDay;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): void
    {
        $this->position = $position;
    }
}
