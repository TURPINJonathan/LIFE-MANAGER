<?php

declare(strict_types=1);

namespace App\Module\Work\Domain\Entity;

use App\Module\Work\Domain\Enum\WorkDocumentKind;
use App\Module\Work\Repository\WorkDocumentRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: WorkDocumentRepository::class)]
#[ORM\Table(name: 'work_document')]
#[ORM\Index(name: 'idx_work_document_job', columns: ['job_id'])]
class WorkDocument
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Job::class)]
    #[ORM\JoinColumn(name: 'job_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Job $job;

    #[ORM\Column(length: 32, enumType: WorkDocumentKind::class)]
    private WorkDocumentKind $kind;

    #[ORM\Column(length: 200)]
    private string $label;

    #[ORM\Column(length: 7, nullable: true)]
    private ?string $yearMonth = null;

    #[ORM\Column(length: 512, nullable: true)]
    private ?string $path = null;

    #[ORM\Column(length: 128, nullable: true)]
    private ?string $mime = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $originalName = null;

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    private ?int $size = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(Job $job, WorkDocumentKind $kind, string $label, ?string $yearMonth = null)
    {
        $this->id = Uuid::v7();
        $this->job = $job;
        $this->kind = $kind;
        $this->label = trim($label);
        $this->yearMonth = null !== $yearMonth && '' !== trim($yearMonth) ? trim($yearMonth) : null;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getJob(): Job
    {
        return $this->job;
    }

    public function getKind(): WorkDocumentKind
    {
        return $this->kind;
    }

    public function setKind(WorkDocumentKind $kind): void
    {
        $this->kind = $kind;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function setLabel(string $label): void
    {
        $this->label = trim($label);
    }

    public function getYearMonth(): ?string
    {
        return $this->yearMonth;
    }

    public function setYearMonth(?string $yearMonth): void
    {
        $this->yearMonth = null !== $yearMonth && '' !== trim($yearMonth) ? trim($yearMonth) : null;
    }

    public function getPath(): ?string
    {
        return $this->path;
    }

    public function getMime(): ?string
    {
        return $this->mime;
    }

    public function getOriginalName(): ?string
    {
        return $this->originalName;
    }

    public function getSize(): ?int
    {
        return $this->size;
    }

    public function hasFile(): bool
    {
        return null !== $this->path && '' !== $this->path;
    }

    public function setFile(?string $path, ?string $mime, ?string $originalName, ?int $size): void
    {
        $this->path = null !== $path && '' !== trim($path) ? trim($path) : null;
        $this->mime = null !== $mime && '' !== trim($mime) ? trim($mime) : null;
        $this->originalName = null !== $originalName && '' !== trim($originalName) ? trim($originalName) : null;
        $this->size = $size;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
