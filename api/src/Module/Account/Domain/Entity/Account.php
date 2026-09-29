<?php

declare(strict_types=1);

namespace App\Module\Account\Domain\Entity;

use App\Module\Account\Repository\AccountRepository;
use App\Module\Security\Domain\Entity\User;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: AccountRepository::class)]
#[ORM\Table(name: 'account')]
#[ORM\Index(name: 'idx_account_owner', columns: ['owner_id'])]
class Account
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'owner_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\Column(length: 160)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $archivedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    /** @var Collection<int, SubAccount> */
    #[ORM\OneToMany(targetEntity: SubAccount::class, mappedBy: 'account', cascade: ['persist'], orphanRemoval: false)]
    #[ORM\OrderBy(['position' => 'ASC', 'name' => 'ASC'])]
    private Collection $subAccounts;

    public function __construct(User $owner, string $name, ?string $notes = null, int $position = 0)
    {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->name = trim($name);
        $this->notes = null !== $notes && '' !== trim($notes) ? trim($notes) : null;
        $this->position = $position;
        $this->createdAt = new \DateTimeImmutable();
        $this->subAccounts = new ArrayCollection();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOwner(): User
    {
        return $this->owner;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): void
    {
        $this->name = trim($name);
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

    /** @return Collection<int, SubAccount> */
    public function getSubAccounts(): Collection
    {
        return $this->subAccounts;
    }
}
