<?php

declare(strict_types=1);

namespace App\Module\Work\Domain\Entity;

use App\Module\Work\Repository\TimeEntryRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: TimeEntryRepository::class)]
#[ORM\Table(name: 'work_time_entry')]
#[ORM\UniqueConstraint(name: 'uniq_work_time_entry_job_date', columns: ['job_id', 'work_date'])]
#[ORM\Index(name: 'idx_work_time_entry_job', columns: ['job_id'])]
class TimeEntry
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Job::class)]
    #[ORM\JoinColumn(name: 'job_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Job $job;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $workDate;

    #[ORM\Column(type: Types::INTEGER)]
    private int $pauseMinutes = 0;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $workedMinutesOverride = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    /** @var Collection<int, TimeSegment> */
    #[ORM\OneToMany(targetEntity: TimeSegment::class, mappedBy: 'timeEntry', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[ORM\OrderBy(['position' => 'ASC'])]
    private Collection $segments;

    public function __construct(Job $job, \DateTimeImmutable $workDate)
    {
        $this->id = Uuid::v7();
        $this->job = $job;
        $this->workDate = $workDate;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = $this->createdAt;
        $this->segments = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getJob(): Job
    {
        return $this->job;
    }

    public function getWorkDate(): \DateTimeImmutable
    {
        return $this->workDate;
    }

    public function setWorkDate(\DateTimeImmutable $workDate): void
    {
        $this->workDate = $workDate;
        $this->touch();
    }

    public function getPauseMinutes(): int
    {
        return $this->pauseMinutes;
    }

    public function setPauseMinutes(int $pauseMinutes): void
    {
        $this->pauseMinutes = max(0, $pauseMinutes);
        $this->touch();
    }

    public function getWorkedMinutesOverride(): ?int
    {
        return $this->workedMinutesOverride;
    }

    public function setWorkedMinutesOverride(?int $workedMinutesOverride): void
    {
        $this->workedMinutesOverride = $workedMinutesOverride;
        $this->touch();
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): void
    {
        $this->notes = null !== $notes && '' !== trim($notes) ? trim($notes) : null;
        $this->touch();
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    /**
     * @return Collection<int, TimeSegment>
     */
    public function getSegments(): Collection
    {
        return $this->segments;
    }

    public function clearSegments(): void
    {
        $this->segments->clear();
        $this->touch();
    }

    public function addSegment(TimeSegment $segment): void
    {
        if (!$this->segments->contains($segment)) {
            $this->segments->add($segment);
        }
        $this->touch();
    }

    private function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
