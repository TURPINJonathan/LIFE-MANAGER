<?php

declare(strict_types=1);

namespace App\Module\Account\Repository;

use App\Module\Account\Domain\Entity\Account;
use App\Module\Security\Domain\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Account>
 */
class AccountRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Account::class);
    }

    public function save(Account $account): void
    {
        $this->getEntityManager()->persist($account);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?Account
    {
        return $this->findOneBy(['id' => $id, 'owner' => $owner]);
    }

    /**
     * @return list<Account>
     */
    public function listForOwner(User $owner, bool $includeArchived = false): array
    {
        $qb = $this->createQueryBuilder('a')
            ->andWhere('a.owner = :owner')
            ->setParameter('owner', $owner)
            ->orderBy('a.position', 'ASC')
            ->addOrderBy('a.name', 'ASC');

        if (!$includeArchived) {
            $qb->andWhere('a.archivedAt IS NULL');
        }

        /** @var list<Account> $rows */
        $rows = $qb->getQuery()->getResult();

        return $rows;
    }
}
