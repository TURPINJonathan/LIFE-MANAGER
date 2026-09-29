<?php

declare(strict_types=1);

namespace App\Module\Category\Domain\Entity;

use App\Module\Category\Domain\Enum\CategoryKind;
use App\Module\Category\Repository\CategoryRepository;
use App\Module\Merchant\Domain\Entity\Merchant;
use App\Module\Security\Domain\Entity\User;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: CategoryRepository::class)]
#[ORM\Table(name: 'category')]
#[ORM\Index(name: 'idx_category_owner', columns: ['owner_id'])]
class Category
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'owner_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\Column(length: 120)]
    private string $name;

    #[ORM\Column(length: 64)]
    private string $icon;

    #[ORM\Column(length: 7)]
    private string $color;

    #[ORM\Column(length: 16, enumType: CategoryKind::class)]
    private CategoryKind $kind;

    #[ORM\Column(type: Types::INTEGER)]
    private int $position;

    /** @var Collection<int, Merchant> */
    #[ORM\ManyToMany(targetEntity: Merchant::class, inversedBy: 'categories')]
    #[ORM\JoinTable(name: 'category_merchant')]
    #[ORM\JoinColumn(name: 'category_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    #[ORM\InverseJoinColumn(name: 'merchant_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    #[ORM\OrderBy(['name' => 'ASC'])]
    private Collection $merchants;

    #[ORM\ManyToOne(targetEntity: Merchant::class)]
    #[ORM\JoinColumn(name: 'favorite_merchant_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?Merchant $favoriteMerchant = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $archivedAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        User $owner,
        string $name,
        string $icon,
        string $color,
        CategoryKind $kind,
        int $position = 0,
    ) {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->name = trim($name);
        $this->icon = trim($icon);
        $this->color = strtoupper(trim($color));
        $this->kind = $kind;
        $this->position = $position;
        $this->merchants = new ArrayCollection();
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

    public function getKind(): CategoryKind
    {
        return $this->kind;
    }

    public function setKind(CategoryKind $kind): void
    {
        $this->kind = $kind;
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
     * @return Collection<int, Merchant>
     */
    public function getMerchants(): Collection
    {
        return $this->merchants;
    }

    public function addMerchant(Merchant $merchant): void
    {
        if (!$this->merchants->contains($merchant)) {
            $this->merchants->add($merchant);
            $merchant->getCategories()->add($this);
        }
        $this->normalizeFavorite();
    }

    public function removeMerchant(Merchant $merchant): void
    {
        if ($this->merchants->removeElement($merchant)) {
            $merchant->getCategories()->removeElement($this);
        }
        $this->normalizeFavorite();
    }

    /**
     * @param list<Merchant> $merchants
     */
    public function syncMerchants(array $merchants): void
    {
        foreach ($this->merchants->toArray() as $existing) {
            $this->removeMerchant($existing);
        }
        foreach ($merchants as $merchant) {
            $this->addMerchant($merchant);
        }
        $this->normalizeFavorite();
    }

    public function getFavoriteMerchant(): ?Merchant
    {
        return $this->favoriteMerchant;
    }

    public function setFavoriteMerchant(?Merchant $merchant): void
    {
        if (null === $merchant) {
            $this->favoriteMerchant = null;
            $this->normalizeFavorite();

            return;
        }
        if (!$this->merchants->contains($merchant)) {
            throw new \InvalidArgumentException('Le favori doit être une enseigne liée à la catégorie.');
        }
        $this->favoriteMerchant = $merchant;
    }

    /** Favori auto si une seule enseigne ; clear si le favori n’est plus lié. */
    public function normalizeFavorite(): void
    {
        $count = $this->merchants->count();
        if (0 === $count) {
            $this->favoriteMerchant = null;

            return;
        }
        if (1 === $count) {
            $this->favoriteMerchant = $this->merchants->first() ?: null;

            return;
        }
        if (null !== $this->favoriteMerchant && !$this->merchants->contains($this->favoriteMerchant)) {
            $this->favoriteMerchant = null;
        }
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
