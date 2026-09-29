<?php

declare(strict_types=1);

namespace App\Module\Account\Domain\Entity;

use App\Module\Account\Repository\SubAccountRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: SubAccountRepository::class)]
#[ORM\Table(name: 'sub_account')]
#[ORM\Index(name: 'idx_sub_account_account', columns: ['account_id'])]
class SubAccount
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Account::class, inversedBy: 'subAccounts')]
    #[ORM\JoinColumn(name: 'account_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private Account $account;

    #[ORM\Column(length: 160)]
    private string $name;

    #[ORM\Column(length: 64)]
    private string $icon;

    #[ORM\Column(length: 7)]
    private string $color;

    #[ORM\Column(type: Types::INTEGER)]
    private int $openingBalanceCents;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $archivedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        Account $account,
        string $name,
        string $icon,
        string $color,
        int $openingBalanceCents = 0,
        int $position = 0,
    ) {
        $this->id = Uuid::v7();
        $this->account = $account;
        $this->name = trim($name);
        $this->icon = trim($icon);
        $this->color = strtoupper(trim($color));
        $this->openingBalanceCents = $openingBalanceCents;
        $this->position = $position;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getAccount(): Account
    {
        return $this->account;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): void
    {
        $this->name = trim($name);
    }

    public function getIcon(): string
    {
        return $this->icon;
    }

    public function setIcon(string $icon): void
    {
        $this->icon = trim($icon);
    }

    public function getColor(): string
    {
        return $this->color;
    }

    public function setColor(string $color): void
    {
        $this->color = strtoupper(trim($color));
    }

    public function getOpeningBalanceCents(): int
    {
        return $this->openingBalanceCents;
    }

    public function setOpeningBalanceCents(int $openingBalanceCents): void
    {
        $this->openingBalanceCents = $openingBalanceCents;
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
}
