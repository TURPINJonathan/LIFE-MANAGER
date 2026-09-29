<?php

declare(strict_types=1);

namespace App\Module\Category\Repository;

use App\Module\Category\Domain\Entity\Category;
use App\Module\Security\Domain\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Category>
 */
class CategoryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Category::class);
    }

    public function save(Category $category): void
    {
        $this->getEntityManager()->persist($category);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?Category
    {
        return $this->findOneBy(['id' => $id, 'owner' => $owner]);
    }

    /**
     * @return list<Category>
     */
    public function listForOwner(User $owner, bool $includeArchived = false): array
    {
        $qb = $this->createQueryBuilder('c')
            ->leftJoin('c.merchants', 'm')->addSelect('m')
            ->leftJoin('c.favoriteMerchant', 'fm')->addSelect('fm')
            ->andWhere('c.owner = :owner')
            ->setParameter('owner', $owner)
            ->orderBy('c.position', 'ASC')
            ->addOrderBy('c.name', 'ASC');

        if (!$includeArchived) {
            $qb->andWhere('c.archivedAt IS NULL');
        }

        /** @var list<Category> $rows */
        $rows = $qb->getQuery()->getResult();

        return $rows;
    }

    public function countTransactions(Category $category): int
    {
        return (int) $this->getEntityManager()->createQuery(
            'SELECT COUNT(t.id) FROM App\Module\Account\Domain\Entity\Transaction t WHERE t.category = :category',
        )->setParameter('category', $category)->getSingleScalarResult();
    }
}
