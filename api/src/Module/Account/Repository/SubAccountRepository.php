<?php

declare(strict_types=1);

namespace App\Module\Account\Repository;

use App\Module\Account\Domain\Entity\Account;
use App\Module\Account\Domain\Entity\SubAccount;
use App\Module\Security\Domain\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<SubAccount>
 */
class SubAccountRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SubAccount::class);
    }

    public function save(SubAccount $subAccount): void
    {
        $this->getEntityManager()->persist($subAccount);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?SubAccount
    {
        /** @var SubAccount|null $sub */
        $sub = $this->createQueryBuilder('s')
            ->innerJoin('s.account', 'a')
            ->andWhere('s.id = :id')
            ->andWhere('a.owner = :owner')
            ->setParameter('id', $id)
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getOneOrNullResult();

        return $sub;
    }

    /**
     * @return list<SubAccount>
     */
    public function listForAccount(Account $account, bool $includeArchived = false): array
    {
        $qb = $this->createQueryBuilder('s')
            ->andWhere('s.account = :account')
            ->setParameter('account', $account)
            ->orderBy('s.position', 'ASC')
            ->addOrderBy('s.name', 'ASC');

        if (!$includeArchived) {
            $qb->andWhere('s.archivedAt IS NULL');
        }

        /** @var list<SubAccount> $rows */
        $rows = $qb->getQuery()->getResult();

        return $rows;
    }
}
