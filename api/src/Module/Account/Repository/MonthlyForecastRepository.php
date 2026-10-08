<?php

declare(strict_types=1);

namespace App\Module\Account\Repository;

use App\Module\Account\Domain\Entity\MonthlyForecast;
use App\Module\Account\Domain\Entity\SubAccount;
use App\Module\Security\Domain\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Uid\Uuid;

/**
 * @extends ServiceEntityRepository<MonthlyForecast>
 */
class MonthlyForecastRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MonthlyForecast::class);
    }

    public function save(MonthlyForecast $forecast): void
    {
        $this->getEntityManager()->persist($forecast);
        $this->getEntityManager()->flush();
    }

    public function remove(MonthlyForecast $forecast): void
    {
        $this->getEntityManager()->remove($forecast);
        $this->getEntityManager()->flush();
    }

    public function findOwned(Uuid $id, User $owner): ?MonthlyForecast
    {
        /** @var MonthlyForecast|null $forecast */
        $forecast = $this->createQueryBuilder('f')
            ->innerJoin('f.subAccount', 's')
            ->innerJoin('s.account', 'a')
            ->andWhere('f.id = :id')
            ->andWhere('a.owner = :owner')
            ->setParameter('id', $id)
            ->setParameter('owner', $owner)
            ->getQuery()
            ->getOneOrNullResult();

        return $forecast;
    }

    public function findForSubAccountMonth(SubAccount $subAccount, string $yearMonth): ?MonthlyForecast
    {
        /** @var MonthlyForecast|null $forecast */
        $forecast = $this->createQueryBuilder('f')
            ->andWhere('f.subAccount = :sub')
            ->andWhere('f.yearMonth = :ym')
            ->setParameter('sub', $subAccount)
            ->setParameter('ym', $yearMonth)
            ->getQuery()
            ->getOneOrNullResult();

        return $forecast;
    }

    /**
     * Budgets des sous-comptes actifs, bornes YYYY-MM incluses.
     *
     * @return list<MonthlyForecast>
     */
    public function listOwnedBetween(User $owner, string $fromYearMonth, string $toYearMonth): array
    {
        /** @var list<MonthlyForecast> $rows */
        $rows = $this->createQueryBuilder('f')
            ->innerJoin('f.subAccount', 's')
            ->innerJoin('s.account', 'a')
            ->leftJoin('f.lines', 'l')
            ->addSelect('l')
            ->leftJoin('l.category', 'c')
            ->addSelect('c')
            ->andWhere('a.owner = :owner')
            ->andWhere('a.archivedAt IS NULL')
            ->andWhere('s.archivedAt IS NULL')
            ->andWhere('f.yearMonth >= :from')
            ->andWhere('f.yearMonth <= :to')
            ->setParameter('owner', $owner)
            ->setParameter('from', $fromYearMonth)
            ->setParameter('to', $toYearMonth)
            ->getQuery()
            ->getResult();

        // Un fetch-join sur les lignes répète le budget une fois par ligne.
        $unique = [];
        foreach ($rows as $forecast) {
            $unique[$forecast->getId()->toRfc4122()] = $forecast;
        }

        return array_values($unique);
    }
}
