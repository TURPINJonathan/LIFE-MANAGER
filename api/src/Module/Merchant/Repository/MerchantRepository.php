<?php

declare(strict_types=1);

namespace App\Module\Merchant\Repository;

use App\Module\Merchant\Domain\Entity\Merchant;
use App\Module\Security\Domain\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Merchant>
 */
class MerchantRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Merchant::class);
    }

    public function save(Merchant $merchant): void
    {
        $this->getEntityManager()->persist($merchant);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?Merchant
    {
        return $this->findOneBy(['id' => $id, 'owner' => $owner]);
    }

    /**
     * @return list<Merchant>
     */
    public function listForOwner(User $owner, bool $includeArchived = false): array
    {
        $qb = $this->createQueryBuilder('m')
            ->leftJoin('m.categories', 'c')->addSelect('c')
            ->andWhere('m.owner = :owner')
            ->setParameter('owner', $owner)
            ->orderBy('m.position', 'ASC')
            ->addOrderBy('m.name', 'ASC');

        if (!$includeArchived) {
            $qb->andWhere('m.archivedAt IS NULL');
        }

        /** @var list<Merchant> $rows */
        $rows = $qb->getQuery()->getResult();

        return $rows;
    }

    public function countTransactions(Merchant $merchant): int
    {
        return (int) $this->getEntityManager()->createQuery(
            'SELECT COUNT(t.id) FROM App\Module\Account\Domain\Entity\Transaction t WHERE t.merchant = :merchant',
        )->setParameter('merchant', $merchant)->getSingleScalarResult();
    }
}
