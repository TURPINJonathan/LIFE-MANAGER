<?php

declare(strict_types=1);

namespace App\Module\Category\Service;

use App\Module\Category\Domain\Entity\Category;
use App\Module\Category\Domain\Enum\CategoryKind;
use App\Module\Category\Exception\CategoryInUseException;
use App\Module\Category\Exception\CategoryNotFoundException;
use App\Module\Category\Repository\CategoryRepository;
use App\Module\Merchant\Domain\Entity\Merchant;
use App\Module\Merchant\Exception\MerchantNotFoundException;
use App\Module\Merchant\Repository\MerchantRepository;
use App\Module\Security\Contract\Service\ICurrentUserAccessor;
use App\Module\Security\Domain\Entity\User;
use Symfony\Component\Uid\Uuid;

final class CategoryManager
{
    public function __construct(
        private readonly CategoryRepository $categories,
        private readonly MerchantRepository $merchants,
        private readonly ICurrentUserAccessor $users,
    ) {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(bool $includeArchived = false): array
    {
        return array_map(
            $this->serialize(...),
            $this->categories->listForOwner($this->users->requireUser(), $includeArchived),
        );
    }

    /**
     * @param array{
     *     name: string,
     *     icon: string,
     *     color: string,
     *     kind: string,
     *     position?: int,
     *     merchantIds?: list<string>,
     *     favoriteMerchantId?: string|null
     * } $data
     *
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        $owner = $this->users->requireUser();
        $category = new Category(
            $owner,
            $data['name'],
            $data['icon'],
            $data['color'],
            CategoryKind::from($data['kind']),
            $data['position'] ?? 0,
        );
        if (\array_key_exists('merchantIds', $data)) {
            $this->applyMerchantLinks($category, $owner, $data['merchantIds'], $data['favoriteMerchantId'] ?? null);
        }
        $this->categories->save($category);

        return $this->serialize($category);
    }

    /**
     * @param array{
     *     name?: string,
     *     icon?: string,
     *     color?: string,
     *     kind?: string,
     *     position?: int,
     *     merchantIds?: list<string>,
     *     favoriteMerchantId?: string|null
     * } $data
     *
     * @return array<string, mixed>
     */
    public function update(string $id, array $data): array
    {
        $owner = $this->users->requireUser();
        $category = $this->requireOwned($id);
        if (isset($data['name'])) {
            $category->setName($data['name']);
        }
        if (isset($data['icon'])) {
            $category->setIcon($data['icon']);
        }
        if (isset($data['color'])) {
            $category->setColor($data['color']);
        }
        if (isset($data['kind'])) {
            $category->setKind(CategoryKind::from($data['kind']));
        }
        if (isset($data['position'])) {
            $category->setPosition($data['position']);
        }
        if (\array_key_exists('merchantIds', $data)) {
            $this->applyMerchantLinks(
                $category,
                $owner,
                $data['merchantIds'] ?? [],
                \array_key_exists('favoriteMerchantId', $data) ? $data['favoriteMerchantId'] : null,
                \array_key_exists('favoriteMerchantId', $data),
            );
        } elseif (\array_key_exists('favoriteMerchantId', $data)) {
            $this->applyFavoriteOnly($category, $owner, $data['favoriteMerchantId']);
        }
        $this->categories->save($category);

        return $this->serialize($category);
    }

    /**
     * @return array<string, mixed>
     */
    public function archive(string $id): array
    {
        $category = $this->requireOwned($id);
        if ($this->categories->countTransactions($category) > 0) {
            throw new CategoryInUseException();
        }
        $category->archive();
        $this->categories->save($category);

        return $this->serialize($category);
    }

    public function requireOwnedEntity(string $id): Category
    {
        return $this->requireOwned($id);
    }

    private function requireOwned(string $id): Category
    {
        $category = $this->categories->findOwned(Uuid::fromString($id), $this->users->requireUser());
        if (null === $category || $category->isArchived()) {
            throw new CategoryNotFoundException();
        }

        return $category;
    }

    /**
     * @param list<string> $merchantIds
     */
    private function applyMerchantLinks(
        Category $category,
        User $owner,
        array $merchantIds,
        ?string $favoriteMerchantId,
        bool $favoriteExplicit = true,
    ): void {
        $resolved = $this->resolveMerchants($owner, $merchantIds);
        $category->syncMerchants($resolved);
        if ($favoriteExplicit) {
            if (null === $favoriteMerchantId || '' === $favoriteMerchantId) {
                $category->setFavoriteMerchant(null);
            } else {
                $favorite = $this->requireMerchant($owner, $favoriteMerchantId);
                $category->setFavoriteMerchant($favorite);
            }
        }
        $category->normalizeFavorite();
    }

    private function applyFavoriteOnly(Category $category, User $owner, ?string $favoriteMerchantId): void
    {
        if (null === $favoriteMerchantId || '' === $favoriteMerchantId) {
            $category->setFavoriteMerchant(null);
        } else {
            $category->setFavoriteMerchant($this->requireMerchant($owner, $favoriteMerchantId));
        }
        $category->normalizeFavorite();
    }

    /**
     * @param list<string> $merchantIds
     *
     * @return list<Merchant>
     */
    private function resolveMerchants(User $owner, array $merchantIds): array
    {
        $unique = array_values(array_unique($merchantIds));
        $resolved = [];
        foreach ($unique as $merchantId) {
            $resolved[] = $this->requireMerchant($owner, $merchantId);
        }

        return $resolved;
    }

    private function requireMerchant(User $owner, string $id): Merchant
    {
        $merchant = $this->merchants->findOwned(Uuid::fromString($id), $owner);
        if (null === $merchant || $merchant->isArchived()) {
            throw new MerchantNotFoundException();
        }

        return $merchant;
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Category $category): array
    {
        $merchantIds = [];
        foreach ($category->getMerchants() as $merchant) {
            if (!$merchant->isArchived()) {
                $merchantIds[] = (string) $merchant->getId();
            }
        }

        return [
            'id' => (string) $category->getId(),
            'name' => $category->getName(),
            'icon' => $category->getIcon(),
            'color' => $category->getColor(),
            'kind' => $category->getKind()->value,
            'position' => $category->getPosition(),
            'merchantIds' => $merchantIds,
            'favoriteMerchantId' => $category->getFavoriteMerchant() && !$category->getFavoriteMerchant()->isArchived()
                ? (string) $category->getFavoriteMerchant()->getId()
                : null,
            'archivedAt' => $category->getArchivedAt()?->format(\DateTimeInterface::ATOM),
            'createdAt' => $category->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
