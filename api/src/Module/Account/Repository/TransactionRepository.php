<?php

declare(strict_types=1);

namespace App\Module\Account\Repository;

use App\Module\Account\Domain\Entity\SubAccount;
use App\Module\Account\Domain\Entity\Transaction;
use App\Module\Category\Domain\Entity\Category;
use App\Module\Security\Domain\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<Transaction>
 */
class TransactionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Transaction::class);
    }

    public function save(Transaction $transaction): void
    {
        $this->getEntityManager()->persist($transaction);
        $this->getEntityManager()->flush();
    }

    public function remove(Transaction $transaction): void
    {
        $this->getEntityManager()->remove($transaction);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?Transaction
    {
        /** @var Transaction|null $tx */
        $tx = $this->createQueryBuilder('t')
            ->innerJoin('t.subAccount', 's')
            ->innerJoin('s.account', 'a')
            ->andWhere('t.id = :id')
            ->andWhere('a.owner = :owner')
            ->setParameter('id', $id)
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getOneOrNullResult();

        return $tx;
    }

    /**
     * Ordered for running balance: dated first (effective_date, operation_date, id), then pending.
     *
     * @return list<Transaction>
     */
    public function listForSubAccount(SubAccount $subAccount): array
    {
        /** @var list<Transaction> $rows */
        $rows = $this->createQueryBuilder('t')
            ->andWhere('t.subAccount = :sub')
            ->setParameter('sub', $subAccount)
            ->addSelect('CASE WHEN t.effectiveDate IS NULL THEN 1 ELSE 0 END AS HIDDEN pending')
            ->orderBy('pending', 'ASC')
            ->addOrderBy('t.effectiveDate', 'ASC')
            ->addOrderBy('t.operationDate', 'ASC')
            ->addOrderBy('t.id', 'ASC')
            ->getQuery()
            ->getResult();

        return $rows;
    }

    /**
     * Newest-first page (reverse of {@see listForSubAccount}).
     *
     * @return list<Transaction>
     */
    public function listForSubAccountNewestFirst(SubAccount $subAccount, int $limit, int $offset = 0): array
    {
        /** @var list<Transaction> $rows */
        $rows = $this->createQueryBuilder('t')
            ->andWhere('t.subAccount = :sub')
            ->setParameter('sub', $subAccount)
            ->addSelect('CASE WHEN t.effectiveDate IS NULL THEN 1 ELSE 0 END AS HIDDEN pending')
            ->orderBy('pending', 'DESC')
            ->addOrderBy('t.effectiveDate', 'DESC')
            ->addOrderBy('t.operationDate', 'DESC')
            ->addOrderBy('t.id', 'DESC')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return $rows;
    }

    /** Somme des montants des $count opérations les plus récentes (ordre newest-first). */
    public function sumAmountCentsNewestFirst(SubAccount $subAccount, int $count): int
    {
        if ($count <= 0) {
            return 0;
        }

        $sum = 0;
        foreach ($this->listForSubAccountNewestFirst($subAccount, $count) as $transaction) {
            $sum += $transaction->getAmountCents();
        }

        return $sum;
    }

    public function sumAmountCents(SubAccount $subAccount): int
    {
        $sum = $this->createQueryBuilder('t')
            ->select('COALESCE(SUM(t.amountCents), 0)')
            ->andWhere('t.subAccount = :sub')
            ->andWhere('t.effectiveDate IS NOT NULL')
            ->setParameter('sub', $subAccount)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $sum;
    }

    /** Somme de toutes les opérations (y compris en attente). */
    public function sumAllAmountCents(SubAccount $subAccount): int
    {
        $sum = $this->createQueryBuilder('t')
            ->select('COALESCE(SUM(t.amountCents), 0)')
            ->andWhere('t.subAccount = :sub')
            ->setParameter('sub', $subAccount)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $sum;
    }

    /**
     * Sum of amounts with operation_date strictly before $before (exclusive).
     * Used by forecast stats (réalisé basé sur la date d’opération).
     */
    public function sumAmountCentsBefore(SubAccount $subAccount, \DateTimeImmutable $before): int
    {
        $sum = $this->createQueryBuilder('t')
            ->select('COALESCE(SUM(t.amountCents), 0)')
            ->andWhere('t.subAccount = :sub')
            ->andWhere('t.operationDate < :before')
            ->setParameter('sub', $subAccount)
            ->setParameter('before', $before)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $sum;
    }

    /**
     * Transactions in [from, to] inclusive on operation_date.
     * Used by forecast stats (réalisé basé sur la date d’opération).
     *
     * @return list<Transaction>
     */
    public function listForSubAccountBetween(
        SubAccount $subAccount,
        \DateTimeImmutable $from,
        \DateTimeImmutable $to,
        ?Category $category = null,
    ): array {
        $qb = $this->createQueryBuilder('t')
            ->andWhere('t.subAccount = :sub')
            ->andWhere('t.operationDate >= :from')
            ->andWhere('t.operationDate <= :to')
            ->setParameter('sub', $subAccount)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('t.operationDate', 'ASC')
            ->addOrderBy('t.id', 'ASC');

        if (null !== $category) {
            $qb->andWhere('t.category = :category')
                ->setParameter('category', $category);
        }

        /** @var list<Transaction> $rows */
        $rows = $qb->getQuery()->getResult();

        return $rows;
    }

    public function sumAmountCentsBetween(
        SubAccount $subAccount,
        \DateTimeImmutable $from,
        \DateTimeImmutable $to,
    ): int {
        $sum = $this->createQueryBuilder('t')
            ->select('COALESCE(SUM(t.amountCents), 0)')
            ->andWhere('t.subAccount = :sub')
            ->andWhere('t.effectiveDate IS NOT NULL')
            ->andWhere('t.effectiveDate >= :from')
            ->andWhere('t.effectiveDate <= :to')
            ->setParameter('sub', $subAccount)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $sum;
    }

    /**
     * Opérations (date d’opération) des sous-comptes actifs, avec catégorie.
     *
     * @return list<array{
     *   operationDate: \DateTimeImmutable,
     *   amountCents: int,
     *   subAccountId: string,
     *   categoryId: string,
     *   categoryName: string,
     *   categoryIcon: string,
     *   categoryColor: string,
     *   categoryKind: string
     * }>
     */
    public function listOwnedAmountsBetween(User $owner, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        /** @var list<array<string, mixed>> $rows */
        $rows = $this->createQueryBuilder('t')
            ->select(
                't.operationDate AS operationDate',
                't.amountCents AS amountCents',
                'IDENTITY(t.subAccount) AS subAccountId',
                'IDENTITY(t.category) AS categoryId',
                'c.name AS categoryName',
                'c.icon AS categoryIcon',
                'c.color AS categoryColor',
                'c.kind AS categoryKind',
            )
            ->innerJoin('t.subAccount', 's')
            ->innerJoin('s.account', 'a')
            ->innerJoin('t.category', 'c')
            ->andWhere('a.owner = :owner')
            ->andWhere('a.archivedAt IS NULL')
            ->andWhere('s.archivedAt IS NULL')
            ->andWhere('t.operationDate >= :from')
            ->andWhere('t.operationDate <= :to')
            ->setParameter('owner', $owner)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->getQuery()
            ->getArrayResult();

        $out = [];
        foreach ($rows as $row) {
            $date = $row['operationDate'];
            if (!$date instanceof \DateTimeImmutable) {
                $date = new \DateTimeImmutable((string) $date);
            }
            $kind = $row['categoryKind'];
            if ($kind instanceof \BackedEnum) {
                $kind = $kind->value;
            }
            $categoryId = $row['categoryId'];
            if ($categoryId instanceof Uuid) {
                $categoryId = $categoryId->toRfc4122();
            } else {
                $categoryId = (string) $categoryId;
            }
            $subAccountId = $row['subAccountId'];
            if ($subAccountId instanceof Uuid) {
                $subAccountId = $subAccountId->toRfc4122();
            } else {
                $subAccountId = (string) $subAccountId;
            }
            $out[] = [
                'operationDate' => $date,
                'amountCents'   => (int) $row['amountCents'],
                'subAccountId'  => $subAccountId,
                'categoryId'    => $categoryId,
                'categoryName'  => (string) $row['categoryName'],
                'categoryIcon'  => (string) $row['categoryIcon'],
                'categoryColor' => (string) $row['categoryColor'],
                'categoryKind'  => (string) $kind,
            ];
        }

        return $out;
    }
}
