<?php

declare(strict_types=1);

namespace App\Module\Work\Domain\Entity;

use App\Module\Work\Repository\WorkPlanSegmentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: WorkPlanSegmentRepository::class)]
#[ORM\Table(name: 'work_plan_segment')]
#[ORM\Index(name: 'idx_work_plan_segment_entry', columns: ['plan_entry_id'])]
class WorkPlanSegment
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: WorkPlanEntry::class, inversedBy: 'segments')]
    #[ORM\JoinColumn(name: 'plan_entry_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private WorkPlanEntry $planEntry;

    #[ORM\Column(type: Types::TIME_IMMUTABLE)]
    private \DateTimeImmutable $startTime;

    #[ORM\Column(type: Types::TIME_IMMUTABLE)]
    private \DateTimeImmutable $endTime;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position;

    public function __construct(
        WorkPlanEntry $planEntry,
        \DateTimeImmutable $startTime,
        \DateTimeImmutable $endTime,
        int $position = 0,
    ) {
        $this->id = Uuid::v7();
        $this->planEntry = $planEntry;
        $this->startTime = $startTime;
        $this->endTime = $endTime;
        $this->position = $position;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getPlanEntry(): WorkPlanEntry
    {
        return $this->planEntry;
    }

    public function getStartTime(): \DateTimeImmutable
    {
        return $this->startTime;
    }

    public function getEndTime(): \DateTimeImmutable
    {
        return $this->endTime;
    }

    public function getPosition(): int
    {
        return $this->position;
    }
}
