<?php

declare(strict_types=1);

namespace App\Module\Work\Domain\Entity;

use App\Module\Security\Domain\Entity\User;
use App\Module\Work\Repository\WorkerRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: WorkerRepository::class)]
#[ORM\Table(name: 'work_worker')]
#[ORM\Index(name: 'idx_work_worker_owner', columns: ['owner_id'])]
class Worker
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'owner_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\Column(length: 160)]
    private string $firstName;

    #[ORM\Column(length: 160)]
    private string $lastName;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $archivedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    /** @var Collection<int, Job> */
    #[ORM\OneToMany(targetEntity: Job::class, mappedBy: 'worker', cascade: ['persist'], orphanRemoval: false)]
    #[ORM\OrderBy(['position' => 'ASC', 'title' => 'ASC'])]
    private Collection $jobs;

    public function __construct(
        User $owner,
        string $firstName,
        string $lastName = '',
        ?string $notes = null,
        int $position = 0,
    ) {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->firstName = trim($firstName);
        $this->lastName = trim($lastName);
        $this->notes = null !== $notes && '' !== trim($notes) ? trim($notes) : null;
        $this->position = $position;
        $this->createdAt = new \DateTimeImmutable();
        $this->jobs = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOwner(): User
    {
        return $this->owner;
    }

    public function getFirstName(): string
    {
        return $this->firstName;
    }

    public function setFirstName(string $firstName): void
    {
        $this->firstName = trim($firstName);
    }

    public function getLastName(): string
    {
        return $this->lastName;
    }

    public function setLastName(string $lastName): void
    {
        $this->lastName = trim($lastName);
    }

    /** Libellé d’affichage « Prénom Nom ». */
    public function getFullName(): string
    {
        return trim($this->firstName.' '.$this->lastName);
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): void
    {
        $this->notes = null !== $notes && '' !== trim($notes) ? trim($notes) : null;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): void
    {
        $this->position = $position;
    }

    public function getArchivedAt(): ?\DateTimeImmutable
    {
        return $this->archivedAt;
    }

    public function archive(): void
    {
        $this->archivedAt = new \DateTimeImmutable();
    }

    public function isArchived(): bool
    {
        return null !== $this->archivedAt;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    /**
     * @return Collection<int, Job>
     */
    public function getJobs(): Collection
    {
        return $this->jobs;
    }
}
