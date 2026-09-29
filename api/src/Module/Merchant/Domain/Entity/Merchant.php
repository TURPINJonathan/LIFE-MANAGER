<?php

declare(strict_types=1);

namespace App\Module\Merchant\Domain\Entity;

use App\Module\Category\Domain\Entity\Category;
use App\Module\Merchant\Repository\MerchantRepository;
use App\Module\Security\Domain\Entity\User;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: MerchantRepository::class)]
#[ORM\Table(name: 'merchant')]
#[ORM\Index(name: 'idx_merchant_owner', columns: ['owner_id'])]
class Merchant
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'owner_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\Column(length: 120)]
    private string $name;

    #[ORM\Column(length: 32)]
    private string $color;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $icon = null;

    #[ORM\Column(length: 512, nullable: true)]
    private ?string $imagePath = null;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position;

    /** @var Collection<int, Category> */
    #[ORM\ManyToMany(targetEntity: Category::class, mappedBy: 'merchants')]
    #[ORM\OrderBy(['name' => 'ASC'])]
    private Collection $categories;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $archivedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        User $owner,
        string $name,
        string $color,
        ?string $icon = null,
        int $position = 0,
    ) {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->name = trim($name);
        $this->color = self::normalizeColor($color);
        $this->icon = null !== $icon && '' !== trim($icon) ? trim($icon) : null;
        $this->position = $position;
        $this->categories = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
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

    public function getColor(): string
    {
        return $this->color;
    }

    public function setColor(string $color): void
    {
        $this->color = self::normalizeColor($color);
    }

    private static function normalizeColor(string $color): string
    {
        $trimmed = trim($color);
        if (0 === strcasecmp($trimmed, 'transparent')) {
            return 'transparent';
        }

        return strtoupper($trimmed);
    }

    public function getIcon(): ?string
    {
        return $this->icon;
    }

    public function setIcon(?string $icon): void
    {
        $this->icon = null !== $icon && '' !== trim($icon) ? trim($icon) : null;
    }

    public function getImagePath(): ?string
    {
        return $this->imagePath;
    }

    public function setImagePath(?string $imagePath): void
    {
        $this->imagePath = null !== $imagePath && '' !== trim($imagePath) ? trim($imagePath) : null;
    }

    public function hasImage(): bool
    {
        return null !== $this->imagePath && '' !== $this->imagePath;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): void
    {
        $this->position = $position;
    }

    /**
     * @return Collection<int, Category>
     */
    public function getCategories(): Collection
    {
        return $this->categories;
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
