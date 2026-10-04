<?php

declare(strict_types=1);

namespace App\Module\Work\Domain\Entity;

use App\Module\Work\Repository\TimeShortcutRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: TimeShortcutRepository::class)]
#[ORM\Table(name: 'work_time_shortcut')]
#[ORM\Index(name: 'idx_work_time_shortcut_job', columns: ['job_id'])]
class TimeShortcut
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Job::class)]
    #[ORM\JoinColumn(name: 'job_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Job $job;

    #[ORM\Column(length: 120)]
    private string $label;

    /** @var list<array{start: string, end: string}> */
    #[ORM\Column(type: Types::JSON)]
    private array $segments;

    #[ORM\Column(type: Types::INTEGER)]
    private int $pauseMinutes;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position;

    /**
     * @param list<array{start: string, end: string}> $segments
     */
    public function __construct(
        Job $job,
        string $label,
        array $segments,
        int $pauseMinutes = 0,
        int $position = 0,
    ) {
        $this->id = Uuid::v7();
        $this->job = $job;
        $this->label = trim($label);
        $this->segments = $segments;
        $this->pauseMinutes = max(0, $pauseMinutes);
        $this->position = $position;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getJob(): Job
    {
        return $this->job;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function setLabel(string $label): void
    {
        $this->label = trim($label);
    }

    /**
     * @return list<array{start: string, end: string}>
     */
    public function getSegments(): array
    {
        return $this->segments;
    }

    /**
     * @param list<array{start: string, end: string}> $segments
     */
    public function setSegments(array $segments): void
    {
        $this->segments = $segments;
    }

    public function getPauseMinutes(): int
    {
        return $this->pauseMinutes;
    }

    public function setPauseMinutes(int $pauseMinutes): void
    {
        $this->pauseMinutes = max(0, $pauseMinutes);
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
